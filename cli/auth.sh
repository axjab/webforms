
export GUM_INPUT_PLACEHOLDER=""
export GUM_INPUT_PROMPT="PASSWORD: "

curl -s -X POST \
  -H 'Content-Type:application/json' \
  -d "{ \"identity\":\"x@alj.cx\", \"password\":\"$(gum input --password)\" }" \
  'https://api.alj.cx/api/collections/users/auth-with-password' > /tmp/auth

cat /tmp/auth | jq -r '.token'
