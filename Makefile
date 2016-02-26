COMPONENT := $(notdir $(CURDIR))
PKG_RELEASE ?= 1
PKG_VERSION ?= $(shell node -e "console.log(require('./package.json').st2_version)")
PREFIX ?= /opt/stackstorm/webui/flow
CHANGELOG_COMMENT ?= "automated build, version: $(PKG_VERSION)"
#DEB_EPOCH := $(shell echo $(PKG_VERSION) | grep -q dev || echo '1')
DEB_DISTRO := $(shell (echo $(PKG_VERSION) | grep -q dev) && echo unstable || echo stable)

.PHONY: all build clean install deb rpm
all: build

build:
	node_modules/.bin/gulp build

clean:
	rm -Rf dist/
	mkdir -p dist/

install:
	mkdir -p $(DESTDIR)$(PREFIX)
	cp -R $(CURDIR)/dist/* $(DESTDIR)$(PREFIX)

deb:
	# Stable versions use epoch, for example 1:1.3.1-3, this made to distinguish
	# them form dev versions (which use no epoch).
	[ -z "$(DEB_EPOCH)" ] && _epoch="" || _epoch="$(DEB_EPOCH):"; \
		dch -m --force-distribution -v$${_epoch}$(PKG_VERSION)-$(PKG_RELEASE) -D$(DEB_DISTRO) $(CHANGELOG_COMMENT)
	dpkg-buildpackage -b -uc -us

rpm:
	rpmbuild -bb rpm/st2flow.spec
