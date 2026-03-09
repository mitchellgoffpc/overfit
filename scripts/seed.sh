#!/usr/bin/env bash
set -euo pipefail

base_url="${UNDERFIT_API_BASE:-http://localhost:4000/api/v1}"

wait_for_server() {
  local timeout_ms=30000
  local start_time
  start_time="$(date +%s000)"
  while true; do
    if curl -sS -o /dev/null -f "$base_url/organizations" &>/dev/null; then
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
  curl -sS -w "\n%{http_code}" -H "content-type: application/json" -X "$method" --data "$body" "$base_url$path"
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

user_id="$(jq -r '.user.id' <<<"$auth_body")"

organization_id="org_acme_labs"
project_one_id="project_solaris"
project_two_id="project_orbit"

json_request "PUT" "/organizations/$organization_id" '{"handle":"acme-labs","displayName":"Acme Labs"}' >/dev/null
json_request "PUT" "/organizations/$organization_id/members/$user_id" '{"role":"ADMIN"}' >/dev/null

json_request "PUT" "/projects/$project_one_id" '{"accountId":"org_acme_labs","name":"Solaris","description":"Computer vision experiments for aerial imagery classification."}' >/dev/null
json_request "PUT" "/projects/$project_two_id" '{"accountId":"org_acme_labs","name":"Orbit","description":"Language model evaluation runs for support ticket triage."}' >/dev/null

json_request "PUT" "/runs/run_solaris_001" "{\"projectId\":\"$project_one_id\",\"userId\":\"$user_id\",\"name\":\"baseline-resnet\",\"status\":\"finished\",\"metadata\":{\"accuracy\":0.91,\"epochs\":40,\"dataset\":\"sat-imagery-v2\"}}" >/dev/null
json_request "PUT" "/runs/run_orbit_001" "{\"projectId\":\"$project_two_id\",\"userId\":\"$user_id\",\"name\":\"distilbert-finetune\",\"status\":\"running\",\"metadata\":{\"f1\":0.84,\"dataset\":\"support-tickets\",\"batchSize\":32}}" >/dev/null
json_request "PUT" "/runs/run_orbit_002" "{\"projectId\":\"$project_two_id\",\"userId\":\"$user_id\",\"name\":\"llama3-eval\",\"status\":\"failed\",\"metadata\":{\"reason\":\"oom\",\"maxTokens\":2048,\"samples\":1200}}" >/dev/null

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

for run_id in run_solaris_001 run_orbit_001 run_orbit_002; do
  while IFS=$'\t' read -r scalar_suffix scalar_step scalar_train_loss scalar_train_acc scalar_val_loss scalar_val_acc scalar_timestamp; do
    scalar_id="scalar_${run_id}_${scalar_suffix}"
    json_request "PUT" "/scalars/$scalar_id" "{\"runId\":\"$run_id\",\"step\":$scalar_step,\"values\":{\"train/loss\":$scalar_train_loss,\"train/acc\":$scalar_train_acc,\"val/loss\":$scalar_val_loss,\"val/acc\":$scalar_val_acc},\"timestamp\":\"$scalar_timestamp\"}" >/dev/null
  done <<<"$scalar_rows"
done
