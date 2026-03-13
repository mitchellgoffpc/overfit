#!/usr/bin/env bash
set -euo pipefail

base_url="${UNDERFIT_API_BASE:-http://localhost:4000/api/v1}"
cookie_jar="$(mktemp -t underfit-seed-cookie.XXXXXX)"
trap 'rm -f "$cookie_jar"' EXIT

wait_for_server() {
  local timeout_ms=30000
  local start_time
  start_time="$(date +%s000)"
  while true; do
    if curl -sS -o /dev/null -f "$base_url/health" &>/dev/null; then
      return 0
    fi
    local now
    now="$(date +%s000)"
    if (( now - start_time >= timeout_ms )); then
      echo "Backend not reachable at $base_url" >&2
      return 1
    fi
    sleep 0.25
  done
}

raw_request() {
  local method="$1"
  local path="$2"
  local body="$3"
  if [[ -n "$body" ]]; then
    curl -sS -w "\n%{http_code}" -H "content-type: application/json" -X "$method" -b "$cookie_jar" -c "$cookie_jar" --data "$body" "$base_url$path"
  else
    curl -sS -w "\n%{http_code}" -H "content-type: application/json" -X "$method" -b "$cookie_jar" -c "$cookie_jar" "$base_url$path"
  fi
}

json_request() {
  local method="$1"
  local path="$2"
  local body="$3"
  local response status payload
  response="$(raw_request "$method" "$path" "$body")"
  status="${response##*$'\n'}"
  payload="${response%$'\n'*}"
  if [[ "$status" -lt 200 || "$status" -ge 300 ]]; then
    echo "Seed request failed ($status): $payload" >&2
    return 1
  fi
  echo "$payload"
}

post_log_lines() {
  local project_name="$1"
  local run_name="$2"
  local worker_id="$3"
  local timestamp="$4"
  local content="$5"
  local payload
  payload="$(jq -cn --arg workerId "$worker_id" --arg timestamp "$timestamp" --arg content "$content" '{workerId:$workerId,lines:($content|split("\n")|map(select(length > 0)|{timestamp:$timestamp,content:.}))}')"
  json_request "POST" "/accounts/$user_handle/projects/$project_name/runs/$run_name/logs" "$payload" >/dev/null
}

seed_logs_for_worker() {
  local project_name="$1"
  local run_name="$2"
  local worker_id="$3"
  local row timestamp content

  while IFS= read -r row; do
    timestamp="$(jq -r '.timestamp' <<<"$row")"
    content="$(jq -r '.content' <<<"$row")"
    post_log_lines "$project_name" "$run_name" "$worker_id" "$timestamp" "$content"
  done < <(node <<'NODE'
const start = new Date("2025-01-10T12:00:00.000Z").getTime();
const chunkCount = 14;
const linesPerChunk = 8;

for (let chunk = 0; chunk < chunkCount; chunk += 1) {
  const chunkStart = start + chunk * 15_000;
  const lines = [];
  for (let index = 0; index < linesPerChunk; index += 1) {
    const step = chunk * linesPerChunk + index;
    const loss = Math.max(0.06, 2.1 * Math.exp(-step / 90) + Math.sin(step / 5) * 0.03).toFixed(4);
    const lr = (0.0003 - step * 0.0000015).toFixed(6);
    const now = new Date(chunkStart + index * 1_500).toISOString();
    lines.push(`${now} step=${String(step)} loss=${loss} lr=${lr} tokens=${String(2048 + step * 16)}`);
  }
  process.stdout.write(`${JSON.stringify({ timestamp: new Date(chunkStart).toISOString(), content: `${lines.join("\n")}\n` })}\n`);
}
NODE
)

  json_request "POST" "/accounts/$user_handle/projects/$project_name/runs/$run_name/logs/flush" "{\"workerId\":\"$worker_id\"}" >/dev/null
}

ensure_run() {
  local project_name="$1"
  local desired_name="$2"
  local status_value="$3"
  local metadata_json="$4"
  local get_response get_status created actual_name

  get_response="$(raw_request "GET" "/accounts/$user_handle/projects/$project_name/runs/$desired_name" "")"
  get_status="${get_response##*$'\n'}"
  if [[ "$get_status" -eq 200 ]]; then
    json_request "PUT" "/accounts/$user_handle/projects/$project_name/runs/$desired_name" "{\"status\":\"$status_value\",\"metadata\":$metadata_json}" >/dev/null
    echo "$desired_name"
    return 0
  fi
  if [[ "$get_status" -ne 404 ]]; then
    echo "Seed request failed ($get_status): ${get_response%$'\n'*}" >&2
    return 1
  fi

  created="$(json_request "POST" "/accounts/$user_handle/projects/$project_name/runs" "{\"status\":\"$status_value\",\"metadata\":$metadata_json}")"
  actual_name="$(jq -r '.name' <<<"$created")"
  if [[ -z "$actual_name" || "$actual_name" == "null" ]]; then
    echo "Seed request failed: run creation returned empty name for $project_name" >&2
    return 1
  fi
  echo "$actual_name"
}

wait_for_server

auth_payload='{"email":"test@test.com","handle":"test","password":"test1234"}'
auth_response="$(raw_request "POST" "/auth/register" "$auth_payload")"
auth_status="${auth_response##*$'\n'}"
auth_body="${auth_response%$'\n'*}"

if [[ "$auth_status" -eq 409 ]]; then
  auth_body="$(json_request "POST" "/auth/login" '{"email":"test@test.com","password":"test1234"}')"
elif [[ "$auth_status" -lt 200 || "$auth_status" -ge 300 ]]; then
  echo "Seed request failed ($auth_status): $auth_body" >&2
  exit 1
fi

user_handle="$(jq -r '.user.handle' <<<"$auth_body")"

organization_handle="acme-labs"
project_one_name="solaris"
project_two_name="orbit"

json_request "PUT" "/organizations/$organization_handle" '{"displayName":"Acme Labs"}' >/dev/null
json_request "PUT" "/organizations/$organization_handle/members/$user_handle" '{"role":"ADMIN"}' >/dev/null

json_request "PUT" "/accounts/$user_handle/projects/$project_one_name" '{"description":"Computer vision experiments for aerial imagery classification."}' >/dev/null
json_request "PUT" "/accounts/$user_handle/projects/$project_two_name" '{"description":"Language model evaluation runs for support ticket triage."}' >/dev/null

baseline_run_name="$(ensure_run "$project_one_name" "baseline-resnet" "finished" '{"accuracy":0.91,"epochs":40,"dataset":"sat-imagery-v2"}')"
distilbert_run_name="$(ensure_run "$project_two_name" "distilbert-finetune" "running" '{"f1":0.84,"dataset":"support-tickets","batchSize":32}')"
llama_eval_run_name="$(ensure_run "$project_two_name" "llama3-eval" "failed" '{"reason":"oom","maxTokens":2048,"samples":1200}')"

scalar_rows="$(
  node <<'NODE'
const start = new Date("2025-01-10T12:00:00.000Z").getTime();
for (let index = 0; index < 140; index += 1) {
  const step = index * 30;
  const decay = Math.exp(-index / 70);
  const wobble = Math.sin(index / 6) * 0.06;
  const trainLoss = Math.max(0.08, 2.4 * decay + 0.15 + wobble);
  const trainAcc = Math.min(0.98, 0.42 + (1 - decay) * 0.58 + Math.sin(index / 9) * 0.01);
  const valLoss = Math.max(0.1, 2.55 * decay + 0.22 + Math.sin(index / 7) * 0.08);
  const valAcc = Math.min(0.96, 0.38 + (1 - decay) * 0.56 + Math.cos(index / 10) * 0.012);
  const timestamp = new Date(start + index * 60000).toISOString();
  const idSuffix = String(index).padStart(3, "0");
  process.stdout.write(`${idSuffix}\t${step}\t${trainLoss.toFixed(6)}\t${trainAcc.toFixed(6)}\t${valLoss.toFixed(6)}\t${valAcc.toFixed(6)}\t${timestamp}\n`);
}
NODE
)"

for run_target in "$project_one_name:$baseline_run_name" "$project_two_name:$distilbert_run_name" "$project_two_name:$llama_eval_run_name"; do
  project_name="${run_target%%:*}"
  run_name="${run_target#*:}"
  while IFS=$'\t' read -r scalar_suffix scalar_step scalar_train_loss scalar_train_acc scalar_val_loss scalar_val_acc scalar_timestamp; do
    json_request "POST" "/accounts/$user_handle/projects/$project_name/runs/$run_name/scalars" "{\"step\":$scalar_step,\"values\":{\"train/loss\":$scalar_train_loss,\"train/acc\":$scalar_train_acc,\"val/loss\":$scalar_val_loss,\"val/acc\":$scalar_val_acc},\"timestamp\":\"$scalar_timestamp\"}" >/dev/null
  done <<<"$scalar_rows"
done

seed_logs_for_worker "$project_one_name" "$baseline_run_name" "worker-0"
seed_logs_for_worker "$project_one_name" "$baseline_run_name" "worker-1"
seed_logs_for_worker "$project_two_name" "$distilbert_run_name" "worker-0"
seed_logs_for_worker "$project_two_name" "$distilbert_run_name" "worker-1"
seed_logs_for_worker "$project_two_name" "$llama_eval_run_name" "worker-0"
