
APP_NAME     = JupyterBrowser
MODULE_DIR   = jupyter_browser_nwjs
AUX_DIR      = jupyter_browser_app
NWJS_VERSION = 0.15.2

BUILD_DIR         = build
APP_DIR           = ${BUILD_DIR}/${APP_NAME}.app
APP_BIN           = ${CONTENTS_DIR}/MacOS/nwjs
CONTENTS_DIR      = ${APP_DIR}/Contents
RESOURCES_DIR     = ${CONTENTS_DIR}/Resources
TARGET_MODULE_DIR = ${RESOURCES_DIR}/app.nw

VENDOR_DIR = vendor
NWJS_FULL  = nwjs-sdk-v${NWJS_VERSION}-osx-x64
NWJS_ZIP   = ${NWJS_FULL}.zip
VENDOR_ZIP = ${VENDOR_DIR}/${NWJS_ZIP}
NWJS_URL   = 'http://dl.nwjs.io/v${NWJS_VERSION}/${NWJS_ZIP}'

MODULE_SOURCES = $(wildcard ${MODULE_DIR}/*.*)

MODULE_TARGETS = ${MODULE_SOURCES:${MODULE_DIR}/%=${TARGET_MODULE_DIR}/%}

TARGETS = ${APP_BIN}\
	  ${CONTENTS_DIR}/Info.plist \
          ${RESOURCES_DIR}/en.lproj/InfoPlist.strings \
          ${RESOURCES_DIR}/notebook.icns \
          ${MODULE_TARGETS}

default: ${TARGETS}

echo_targets:
	@for i in ${TARGETS}; do echo $$i; done 

${VENDOR_ZIP}:
	@echo $@
	@mkdir -p '${VENDOR_DIR}'
	@echo curl '${NWJS_URL}' -o '${VENDOR_ZIP}'
	@curl '${NWJS_URL}' -o '${VENDOR_ZIP}'

${APP_BIN}: ${VENDOR_ZIP}
	@echo $@
	@mkdir -p '${BUILD_DIR}'
	@unzip '${VENDOR_ZIP}' '${NWJS_FULL}/nwjs.app/*' -d '${BUILD_DIR}'
	@mv '${BUILD_DIR}/${NWJS_FULL}/nwjs.app' '${APP_DIR}'
	@rmdir '${BUILD_DIR}/${NWJS_FULL}'
	@touch ${APP_BIN}

${CONTENTS_DIR}/Info.plist: ${AUX_DIR}/Info.plist ${APP_BIN}
	@echo $@
	@mkdir -p '${CONTENTS_DIR}'
	@cp $< $@

${RESOURCES_DIR}/en.lproj/InfoPlist.strings: ${AUX_DIR}/InfoPlist.strings ${APP_BIN}
	@echo $@
	@mkdir -p '${RESOURCES_DIR}/en.lproj'
	@cp $< $@

${RESOURCES_DIR}/notebook.icns: ${AUX_DIR}/notebook.icns ${APP_BIN}
	@echo $@
	@mkdir -p '${RESOURCES_DIR}'
	@cp $< $@

${TARGET_MODULE_DIR}/%: ${MODULE_DIR}/% ${APP_BIN}
	@echo $@
	@mkdir -p '${TARGET_MODULE_DIR}'
	@cp $< $@

clean:
	-rm -r ${BUILD_DIR}
