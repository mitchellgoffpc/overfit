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
auth_user() {
  local email="$1" handle="$2" password="$3" payload
  payload="$(jq -cn --arg email "$email" --arg handle "$handle" --arg password "$password" '{email:$email,handle:$handle,password:$password}')"
  request POST /auth/register "$payload"
  if [[ "$RESP_STATUS" == "409" ]]; then
    json_request POST /auth/login "$(jq -cn --arg email "$email" --arg password "$password" '{email:$email,password:$password}')"
  elif (( RESP_STATUS >= 200 && RESP_STATUS < 300 )); then
    echo "$RESP_BODY"
  else
    fail
  fi
}

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

auth_body="$(auth_user "test@test.com" "test" "test1234")"

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

scalar_rows_for_run() {
  local variant="$1"
  node - "$variant" <<'NODE'
const variant = Number(process.argv[2] ?? 0);
const start = new Date("2025-01-10T12:00:00.000Z").getTime() + variant * 180_000;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const speed = 68 + variant * 8;
const trainFloor = 0.08 + variant * 0.02;
const valFloor = 0.1 + variant * 0.03;
const trainAmp = 0.05 + variant * 0.01;
const valAmp = 0.07 + variant * 0.012;
for (let i = 0; i < 140; i += 1) {
  const step = i * 30;
  const decay = Math.exp(-i / speed);
  const trainLossRaw = 2.45 * decay + 0.13 + Math.sin(i / (6 + variant)) * trainAmp + Math.cos(i / (11 + variant)) * 0.012;
  const valLossRaw = 2.6 * decay + 0.2 + Math.sin(i / (7 + variant)) * valAmp + Math.cos(i / (10 + variant)) * 0.016;
  const trainAccRaw = 0.4 + (1 - decay) * (0.57 - variant * 0.03) + Math.sin(i / (9 + variant)) * (0.01 + variant * 0.002);
  const valAccRaw = 0.37 + (1 - decay) * (0.55 - variant * 0.035) + Math.cos(i / (10 + variant)) * (0.012 + variant * 0.0025);
  const trainLoss = Math.max(trainFloor, trainLossRaw);
  const valLoss = Math.max(valFloor, valLossRaw);
  const trainAcc = clamp(trainAccRaw, 0.0, 0.985 - variant * 0.02);
  const valAcc = clamp(valAccRaw, 0.0, 0.965 - variant * 0.025);
  const timestamp = new Date(start + i * 60_000).toISOString();
  process.stdout.write(`${String(i).padStart(3, "0")}\t${step}\t${trainLoss.toFixed(6)}\t${trainAcc.toFixed(6)}\t${valLoss.toFixed(6)}\t${valAcc.toFixed(6)}\t${timestamp}\n`);
}
NODE
}

run_variant=0
for run_target in "$project_one_name:$baseline_run_name" "$project_two_name:$distilbert_run_name" "$project_two_name:$llama_eval_run_name"; do
  project_name="${run_target%%:*}"
  run_name="${run_target#*:}"
  scalar_rows="$(scalar_rows_for_run "$run_variant")"
  start_line=0
  while IFS=$'\t' read -r _ step train_loss train_acc val_loss val_acc timestamp; do
    json_request POST "/accounts/$user_handle/projects/$project_name/runs/$run_name/scalars" "{\"startLine\":$start_line,\"scalars\":[{\"step\":$step,\"values\":{\"train/loss\":$train_loss,\"train/acc\":$train_acc,\"val/loss\":$val_loss,\"val/acc\":$val_acc},\"timestamp\":\"$timestamp\"}]}" >/dev/null
    start_line=$((start_line + 1))
  done <<<"$scalar_rows"
  run_variant=$((run_variant + 1))
done

seed_logs_for_worker "$project_one_name" "$baseline_run_name" worker-0
seed_logs_for_worker "$project_one_name" "$baseline_run_name" worker-1
seed_logs_for_worker "$project_two_name" "$distilbert_run_name" worker-0
seed_logs_for_worker "$project_two_name" "$distilbert_run_name" worker-1
seed_logs_for_worker "$project_two_name" "$llama_eval_run_name" worker-0

john_auth_body="$(auth_user "john@test.com" "john" "test1234")"
john_handle="$(jq -r '.user.handle' <<<"$john_auth_body")"
ensure_project "$john_handle" "showcase" '"Reference project for cross-account profile testing."'
ensure_project "$john_handle" "experiments" '"Secondary project for validating account/project navigation."'
