%define pkg_version %(node -e "console.log(require('./package.json').st2_version);")
%define version %(echo "${PKG_VERSION:-%{pkg_version}}")
%define release %(echo "${PKG_RELEASE:-1}")
#define epoch %(_epoch=`echo %{version} | grep -q dev || echo 1`; echo "${_epoch:-0}")
%define webui_configjs /opt/stackstorm/webui/config.js

Name:           st2flow
Version:        %{version}
%if 0%{?epoch}
Epoch: %{epoch}
%endif
Release:        %{release}
Summary:        St2Flow - StackStorm Workflow Editor

Requires: perl, st2web

License:        Apache
URL:            https://github.com/stackstorm/st2flow
Source0:        st2flow

Prefix:         /opt/stackstorm/webui/flow

%define _builddir %(pwd)
%define _rpmdir %(pwd)/..
%define _build_name_fmt %%{NAME}-%%{VERSION}-%%{RELEASE}.%%{ARCH}.rpm


%description
  <insert long description, indented with spaces>

%prep
  rm -rf %{buildroot}
  mkdir -p %{buildroot}

%post
  %include rpm/postinst_script.spec

%postun
  %include rpm/postrm_script.spec

%build
  make

%install
  %make_install

%clean
  rm -rf %{buildroot}

%files
  /*
