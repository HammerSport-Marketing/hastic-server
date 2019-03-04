%define name hastic-server
%define version %{getenv:HASTIC_RELEASE_VERSION}_node%{getenv:RPM_NODE_VERSION}
%define release 0
%define buildroot /root/rpmbuild/BUILDROOT
%define builddir /root/rpmbuild/BUILD
%define targetdir /usr/bin/hastic-server

Name: %{name}
Version: %{version}
Release: %{release}
Summary: hastic-server

Group: Installation Script
License: Apache-2.0
URL: hastic.io
BuildRoot: %{buildroot}
AutoReqProv: no
AutoReq: no
BuildArch: noarch

%description
REST server for managing data for analytics

%prep
rm -rf %{builddir}/*
mkdir -p %{builddir}
mkdir -p %{builddir}/.git/refs/heads
cp -r %{builddir}/../.git/HEAD %{builddir}/.git
cp -r %{builddir}/../.git/refs/heads %{builddir}/.git/refs
cp -r %{builddir}/../server %{builddir}/
cp -r %{builddir}/../analytics %{builddir}/
set +x
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install %{getenv:NODE_VERSION}
set -x

%build
pushd analytics
mkdir -p dist/server
touch dist/server/server

save=$RPM_BUILD_ROOT
unset RPM_BUILD_ROOT

pip3 install -U pip setuptools pyinstaller
pip3 install -r requirements.txt
pyinstaller -y --additional-hooks-dir=pyinstaller_hooks --paths=analytics/ bin/server

export RPM_BUILD_ROOT=$save
popd

pushd server
set +x
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use %{getenv:NODE_VERSION}
set -x
npm install
npm run build
popd

%install
mkdir -p %{buildroot}/%{targetdir}/server/dist
mkdir -p %{buildroot}/%{targetdir}/.git/refs/heads
mkdir -p %{buildroot}/%{targetdir}/analytics/dist/server
cp -r server/dist %{buildroot}/%{targetdir}/server/
cp -r .git/HEAD %{buildroot}/%{targetdir}/.git
cp -r .git/refs/heads %{buildroot}/%{targetdir}/.git/refs
cp -r analytics/dist/server %{buildroot}/%{targetdir}/analytics/dist/

%post
mkdir -p /etc/hastic-server/
if [ ! -f /etc/hastic-server/config.json ]; then
  echo '{}' > /etc/hastic-server/config.json
fi
if [ ! -f %{targetdir}/config.json ]; then
  ln -s /etc/hastic-server/config.json %{targetdir}/config.json
fi

mkdir -p /var/hastic-server/
if [ ! -d %{targetdir}/data ]; then
  ln -s %{targetdir}/data /var/hastic-server/data
fi

echo 'node %{targetdir}/server/dist/server' > /usr/bin/hastic-server
chmod +x /usr/bin/hastic-server


%clean
rm -rf %{buildroot}

%files
%attr(755, root, root) /usr/lib/hastic-server/analytics/dist/server/server
%defattr(644, root, root, 755)
/usr/lib/hastic-server

%preun
rm /usr/bin/hastic-server
