#!/usr/bin/env bash
# FitCoach AI — end-to-end smoke test.
# Usage (Git Bash):  bash scripts/smoke-test.sh
# Requires the full stack running: docker (postgres/redis/grafana) + pnpm dev.

AUTH=http://localhost:3001
API=http://localhost:3002
AI=http://localhost:3003
PAY=http://localhost:3005
WEB=http://localhost:3000

pass=0; fail=0
ok(){ echo "  ✓ $1"; pass=$((pass+1)); }
ko(){ echo "  ✗ $1 — $2"; fail=$((fail+1)); }
# chk NAME ACTUAL EXPECTED
chk(){ if [ "$2" = "$3" ]; then ok "$1 ($2)"; else ko "$1" "got '$2' expected '$3'"; fi; }
# has NAME HAYSTACK NEEDLE
has(){ case "$2" in *"$3"*) ok "$1";; *) ko "$1" "missing '$3' in: $(echo "$2" | head -c 120)";; esac; }

code(){ curl -s -o /dev/null -m 8 -w "%{http_code}" "$@"; }

echo "==================== INFRA ===================="
for p in 3001 3002 3003 3004 3005; do chk "service :$p /health" "$(code http://localhost:$p/health)" "200"; done
chk "grafana"     "$(code http://localhost:3030/api/health)" "200"
chk "prometheus"  "$(code http://localhost:9090/-/healthy)"  "200"
TGT=$(curl -s -m 5 "http://localhost:9090/api/v1/targets?state=active" | grep -o '"health":"up"' | wc -l | tr -d ' ')
echo "  prometheus targets up: $TGT"
chk "auth /metrics" "$(code $AUTH/metrics)" "200"

echo "==================== AUTH ===================="
EMAIL="smoke_$(date +%s)@test.local"
REG=$(curl -s -m 6 -X POST $AUTH/auth/register -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"TestPass123\",\"name\":\"Smoke\",\"phone\":\"+33600000000\"}")
has "register returns token" "$REG" '"accessToken"'
TOKEN=$(echo "$REG" | grep -oE '"accessToken":"[^"]+"' | head -1 | sed 's/"accessToken":"//;s/"//')
H="Authorization: Bearer $TOKEN"
LOG=$(curl -s -m 6 -X POST $AUTH/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"TestPass123\"}")
has "login returns token" "$LOG" '"accessToken"'
ME=$(curl -s -m 6 $AUTH/auth/me -H "$H"); has "/auth/me" "$ME" "$EMAIL"
chk "google oauth start (302)" "$(code $AUTH/auth/google)" "302"

echo "==================== PROFILE / CALORIES ===================="
PUT=$(curl -s -m 6 -X PUT $API/api/profile -H "$H" -H 'Content-Type: application/json' \
  -d '{"gender":"male","birthDate":"1995-05-10","height":178,"currentWeight":78,"activityLevel":"moderate","goal":"lose_weight"}')
has "profile PUT computes calories" "$PUT" '"dailyCalorieTarget"'
echo "    → $(echo "$PUT" | grep -oE '"dailyCalorieTarget":[0-9]+')"
ONB=$(curl -s -m 6 -X PUT $API/api/profile -H "$H" -H 'Content-Type: application/json' -d '{"onboardingCompleted":true}')
has "onboarding flag" "$ONB" '"onboardingCompleted":true'

echo "==================== WEIGHT / STEPS ===================="
has "weight POST" "$(curl -s -m 6 -X POST $API/api/weight -H "$H" -H 'Content-Type: application/json' -d '{"weight":78.5}')" '"weight"'
has "weight upsert" "$(curl -s -m 6 -X POST $API/api/weight -H "$H" -H 'Content-Type: application/json' -d '{"weight":77.9}')" '77.9'
has "weight GET" "$(curl -s -m 6 "$API/api/weight?days=90" -H "$H")" '77.9'
chk "weight invalid (600) rejected" "$(code -X POST $API/api/weight -H "$H" -H 'Content-Type: application/json' -d '{"weight":600}')" "400"
has "steps POST" "$(curl -s -m 6 -X POST $API/api/steps -H "$H" -H 'Content-Type: application/json' -d '{"steps":8500}')" '8500'
has "steps today %" "$(curl -s -m 6 $API/api/steps/today -H "$H")" '"percentage"'

echo "==================== WORKOUTS ===================="
WK=$(curl -s -m 6 -X POST $API/api/workouts -H "$H" -H 'Content-Type: application/json' \
  -d '{"type":"Smoke day","durationMinutes":45,"exercises":[{"name":"Bench","exerciseType":"muscu","sets":4,"reps":8,"weightKg":60}]}')
has "workout create + calories" "$WK" '"caloriesBurned"'
has "workout list" "$(curl -s -m 6 "$API/api/workouts?limit=20" -H "$H")" 'Smoke day'
has "weekly stats" "$(curl -s -m 6 $API/api/workouts/stats/weekly -H "$H")" '"totalWorkouts"'
has "exercise groups" "$(curl -s -m 8 $API/api/exercises/groups -H "$H")" 'Pectoraux'
has "exercise library" "$(curl -s -m 12 "$API/api/exercises?group=pectoraux&limit=3" -H "$H")" '"items"'

echo "==================== AI / NUTRITION ===================="
has "rate-limit" "$(curl -s -m 6 $API/api/nutrition/rate-limit -H "$H")" '"recipe"'
echo "  …génération recette (Groq, ~10s)…"
REC=$(curl -s -m 45 -X POST $API/api/nutrition/generate-recipe -H "$H" -H 'Content-Type: application/json' -d '{"ingredients":["poulet","riz","brocoli"]}')
has "generate-recipe" "$REC" '"recipe"'
echo "  …chat Frigo Mode (Groq, ~10s)…"
FRG=$(curl -s -m 45 -X POST $API/api/nutrition/frigo-mode -H "$H" -H 'Content-Type: application/json' -d '{"message":"jai du poulet et du riz","conversationHistory":[]}')
has "frigo-mode chat" "$FRG" '"message"'

echo "==================== PAYMENT ===================="
has "plans (pro/premium)" "$(curl -s -m 6 $PAY/api/payment/plans)" '"premium"'
CO=$(curl -s -m 10 -X POST $PAY/api/payment/checkout -H "$H" -H 'Content-Type: application/json' -d '{"tier":"pro"}')
has "checkout returns Stripe url" "$CO" 'checkout.stripe.com'
chk "checkout unauth rejected" "$(code -X POST $PAY/api/payment/checkout -H 'Content-Type: application/json' -d '{"tier":"pro"}')" "401"

echo "==================== NOTIFICATIONS ===================="
has "history" "$(curl -s -m 6 $API/api/notifications -H "$H")" '"items"'
has "test trigger (email/sms)" "$(curl -s -m 15 -X POST $API/api/notifications/test -H "$H")" '"email"'

echo "==================== FRONT PAGES ===================="
for path in / /login /onboarding /dashboard /workouts /weight /steps /nutrition /profile /billing /notifications; do
  chk "page $path" "$(code $WEB$path)" "200"
done
chk "/sw.js" "$(code $WEB/sw.js)" "200"

echo ""
echo "=================================================="
echo "   RESULTAT : $pass OK  /  $fail KO"
echo "=================================================="
[ "$fail" = "0" ] && echo "   ✅ TOUT EST VERT — prêt pour la démo" || echo "   ⚠️  $fail check(s) à regarder"
