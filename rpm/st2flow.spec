%define pkg_version %(node -e "console.log(require('./package.json').st2_version);")
%define version %(echo "${PKG_VERSION:-%{pkg_version}}")
%define release %(echo "${PKG_RELEASE:-1}")
#define epoch %(_epoch=`echo %{version} | grep -q dev || echo 1`; echo "${_epoch:-0}")
%define webui_configjs /opt/stackstorm/static/webui/config.js

Name:           st2flow
Version:        %{version}
%if 0%{?epoch}
Epoch: %{epoch}
%endif
Release:        %{release}
Summary:        Extreme Workflow Designer

Requires: perl, st2web

License:        StackStorm Enterprise EULA
URL:            https://www.extremenetworks.com/product/workflow-composer/
Source0:        st2flow

Prefix:         /opt/stackstorm/static/webui/flow

%define _builddir %(pwd)
%define _rpmdir %(pwd)/..
%define _build_name_fmt %%{NAME}-%%{VERSION}-%%{RELEASE}.%%{ARCH}.rpm


%description
  Workflow Designer is an HTML5-based graphical tool for managing workflows. Using a web browser,
  users can quickly create new workflows and modify existing ones.

  Workflow Designer provides a graphical representation of the workflow, side-by-side with the
  underlying code. Users can quickly add new actions to the workflow, and connect them together.
  Updates to the graphical workflow are immediately reflected in the code, and vice-versa.

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
  %doc rpm/LICENSE
  /*
