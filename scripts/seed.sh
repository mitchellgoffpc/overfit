#!/usr/bin/env bash
set -euo pipefail

base_url="${UNDERFIT_API_BASE:-http://localhost:4000/api/v1}"
cookie_jar="$(mktemp -t underfit-seed-cookie.XXXXXX)"
trap 'rm -f "$cookie_jar"' EXIT

fail() { echo "Seed request failed ($RESP_STATUS): $RESP_BODY" >&2; exit 1; }
request() {
  local method="$1" path="$2" body="${3:-}" res
  if [[ -n "$body" ]]; then
    res="$(curl -sS -w "\n%{http_code}" -H "content-type: application/json" -X "$method" -b "$cookie_jar" -c "$cookie_jar" --data "$body" "$base_url$path")"
  else
    res="$(curl -sS -w "\n%{http_code}" -H "content-type: application/json" -X "$method" -b "$cookie_jar" -c "$cookie_jar" "$base_url$path")"
  fi
  RESP_STATUS="${res##*$'\n'}"
  RESP_BODY="${res%$'\n'*}"
}
json_request() { request "$1" "$2" "${3:-}"; (( RESP_STATUS >= 200 && RESP_STATUS < 300 )) || fail; echo "$RESP_BODY"; }

for _ in {1..120}; do curl -sS -o /dev/null -f "$base_url/health" && break || sleep 0.25; done
curl -sS -o /dev/null -f "$base_url/health" || { echo "Backend not reachable at $base_url" >&2; exit 1; }

ensure_organization() {
  local handle="$1" name="$2"
  request GET "/accounts/$handle"
  if [[ "$RESP_STATUS" == "404" ]]; then
    request POST "/organizations" "{\"handle\":\"$handle\",\"name\":\"$name\"}"
    [[ "$RESP_STATUS" == "201" || "$RESP_STATUS" == "409" ]] || fail
  elif [[ "$RESP_STATUS" != "200" ]]; then
    fail
  fi
  json_request PATCH "/organizations/$handle" "{\"name\":\"$name\"}" >/dev/null
}
ensure_project() {
  local handle="$1" name="$2" description="$3"
  request GET "/accounts/$handle/projects/$name"
  if [[ "$RESP_STATUS" == "404" ]]; then
    request POST "/accounts/$handle/projects" "{\"name\":\"$name\",\"description\":$description}"
    [[ "$RESP_STATUS" == "200" || "$RESP_STATUS" == "409" ]] || fail
  elif [[ "$RESP_STATUS" != "200" ]]; then
    fail
  fi
  json_request PUT "/accounts/$handle/projects/$name" "{\"description\":$description}" >/dev/null
}
ensure_run() {
  local project_name="$1" desired_name="$2" status_value="$3" metadata_json="$4"
  request GET "/accounts/$user_handle/projects/$project_name/runs/$desired_name"
  if [[ "$RESP_STATUS" == "200" ]]; then
    json_request PUT "/accounts/$user_handle/projects/$project_name/runs/$desired_name" "{\"status\":\"$status_value\",\"metadata\":$metadata_json}" >/dev/null
    echo "$desired_name"
  elif [[ "$RESP_STATUS" == "404" ]]; then
    json_request POST "/accounts/$user_handle/projects/$project_name/runs" "{\"status\":\"$status_value\",\"metadata\":$metadata_json}" | jq -r '.name'
  else
    fail
  fi
}
seed_logs_for_worker() {
  local project_name="$1" run_name="$2" worker_id="$3" row start_line timestamp content
  while IFS= read -r row; do
    start_line="$(jq -r '.startLine' <<<"$row")"
    timestamp="$(jq -r '.timestamp' <<<"$row")"
    content="$(jq -r '.content' <<<"$row")"
    json_request POST "/accounts/$user_handle/projects/$project_name/runs/$run_name/logs" "$(jq -cn --arg workerId "$worker_id" --argjson startLine "$start_line" --arg timestamp "$timestamp" --arg content "$content" '{workerId:$workerId,startLine:$startLine,lines:($content|split("\\n")|map(select(length > 0)|{timestamp:$timestamp,content:.}))}')" >/dev/null
  done < <(node <<'NODE'
const start = new Date("2025-01-10T12:00:00.000Z").getTime();
const chunkCount = 14;
const linesPerChunk = 8;
let startLine = 0;
for (let chunk = 0; chunk < chunkCount; chunk += 1) {
  const chunkStart = start + chunk * 15_000;
  const lines = [];
  for (let i = 0; i < linesPerChunk; i += 1) {
    const step = chunk * linesPerChunk + i;
    const loss = Math.max(0.06, 2.1 * Math.exp(-step / 90) + Math.sin(step / 5) * 0.03).toFixed(4);
    const lr = (0.0003 - step * 0.0000015).toFixed(6);
    const now = new Date(chunkStart + i * 1_500).toISOString();
    lines.push(`${now} step=${String(step)} loss=${loss} lr=${lr} tokens=${String(2048 + step * 16)}`);
  }
  process.stdout.write(`${JSON.stringify({ startLine, timestamp: new Date(chunkStart).toISOString(), content: `${lines.join("\n")}\n` })}\n`);
  startLine += linesPerChunk;
}
NODE
)
  json_request POST "/accounts/$user_handle/projects/$project_name/runs/$run_name/logs/flush" "{\"workerId\":\"$worker_id\"}" >/dev/null
}

request POST /auth/register '{"email":"test@test.com","handle":"test","password":"test1234"}'
if [[ "$RESP_STATUS" == "409" ]]; then
  auth_body="$(json_request POST /auth/login '{"email":"test@test.com","password":"test1234"}')"
elif (( RESP_STATUS >= 200 && RESP_STATUS < 300 )); then
  auth_body="$RESP_BODY"
else
  fail
fi

user_handle="$(jq -r '.user.handle' <<<"$auth_body")"
organization_handle="acme-labs"
project_one_name="solaris"
project_two_name="orbit"

ensure_organization "$organization_handle" "Acme Labs"
json_request PUT "/organizations/$organization_handle/members/$user_handle" '{"role":"ADMIN"}' >/dev/null
ensure_project "$user_handle" "$project_one_name" '"Computer vision experiments for aerial imagery classification."'
ensure_project "$user_handle" "$project_two_name" '"Language model evaluation runs for support ticket triage."'

baseline_run_name="$(ensure_run "$project_one_name" "baseline-resnet" "finished" '{"accuracy":0.91,"epochs":40,"dataset":"sat-imagery-v2"}')"
distilbert_run_name="$(ensure_run "$project_two_name" "distilbert-finetune" "running" '{"f1":0.84,"dataset":"support-tickets","batchSize":32}')"
llama_eval_run_name="$(ensure_run "$project_two_name" "llama3-eval" "failed" '{"reason":"oom","maxTokens":2048,"samples":1200}')"

scalar_rows="$(node <<'NODE'
const start = new Date("2025-01-10T12:00:00.000Z").getTime();
for (let i = 0; i < 140; i += 1) {
  const step = i * 30;
  const decay = Math.exp(-i / 70);
  const trainLoss = Math.max(0.08, 2.4 * decay + 0.15 + Math.sin(i / 6) * 0.06);
  const trainAcc = Math.min(0.98, 0.42 + (1 - decay) * 0.58 + Math.sin(i / 9) * 0.01);
  const valLoss = Math.max(0.1, 2.55 * decay + 0.22 + Math.sin(i / 7) * 0.08);
  const valAcc = Math.min(0.96, 0.38 + (1 - decay) * 0.56 + Math.cos(i / 10) * 0.012);
  const timestamp = new Date(start + i * 60_000).toISOString();
  process.stdout.write(`${String(i).padStart(3, "0")}\t${step}\t${trainLoss.toFixed(6)}\t${trainAcc.toFixed(6)}\t${valLoss.toFixed(6)}\t${valAcc.toFixed(6)}\t${timestamp}\n`);
}
NODE
)"

for run_target in "$project_one_name:$baseline_run_name" "$project_two_name:$distilbert_run_name" "$project_two_name:$llama_eval_run_name"; do
  project_name="${run_target%%:*}"
  run_name="${run_target#*:}"
  start_line=0
  while IFS=$'\t' read -r _ step train_loss train_acc val_loss val_acc timestamp; do
    json_request POST "/accounts/$user_handle/projects/$project_name/runs/$run_name/scalars" "{\"startLine\":$start_line,\"scalars\":[{\"step\":$step,\"values\":{\"train/loss\":$train_loss,\"train/acc\":$train_acc,\"val/loss\":$val_loss,\"val/acc\":$val_acc},\"timestamp\":\"$timestamp\"}]}" >/dev/null
    start_line=$((start_line + 1))
  done <<<"$scalar_rows"
done

seed_logs_for_worker "$project_one_name" "$baseline_run_name" worker-0
seed_logs_for_worker "$project_one_name" "$baseline_run_name" worker-1
seed_logs_for_worker "$project_two_name" "$distilbert_run_name" worker-0
seed_logs_for_worker "$project_two_name" "$distilbert_run_name" worker-1
seed_logs_for_worker "$project_two_name" "$llama_eval_run_name" worker-0
