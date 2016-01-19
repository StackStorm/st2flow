%define pkg_version %(node -e "console.log(require('./package.json').version);")

%define version %(echo "${PKG_VERSION:-%{pkg_version}}")
%define release %(echo "${PKG_RELEASE:-1}")

Name:           st2flow
Version:        %{version}
Release:        %{release}
Summary:        St2Flow - StackStorm Workflow Editor

License:        Apache
URL:            https://github.com/stackstorm/st2flow
Source0:        st2flow

Prefix:         /opt/stackstorm/static/webui/flow

%define _builddir %(pwd)
%define _rpmdir %(pwd)/..
%define _build_name_fmt %%{NAME}-%%{VERSION}-%%{RELEASE}.%%{ARCH}.rpm


%description
  <insert long description, indented with spaces>

%prep
  rm -rf %{buildroot}
  mkdir -p %{buildroot}

%build
  make

%install
  %make_install

%clean
  rm -rf %{buildroot}

%files
  /*
