set -e

WEBUI_CONFIGJS=%{webui_configjs}
FLOW_CONFIG=$(cat <<EHD
// Package injected: flow-config
angular.module('main').run(
    function (st2Config) {
        st2Config.flow = '/flow';
    }
);
// Package injected: flow-config
EHD
)

[ -f "$WEBUI_CONFIGJS" ] || { echo "St2web \`${WEBUI_CONFIGJS}' not found"; exit 1; }
# configuration has been already injected (might be by hand), so return
grep -q "st2Config.flow\\s\+=\\s\+" $WEBUI_CONFIGJS && return 0 || :
echo "$FLOW_CONFIG" >> $WEBUI_CONFIGJS
