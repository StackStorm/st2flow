set -e

WEBUI_CONFIGJS=%{webui_configjs}
injecthdr="// Package injected:"

jsremove_flow() {
  [ -f "$WEBUI_CONFIGJS" ] || { echo "St2web \`${WEBUI_CONFIGJS}' not found"; exit 0; }
  perl -pi -0e "s#${injecthdr} flow-config(.|\n)*${injecthdr} flow-config\n##" $WEBUI_CONFIGJS
}
