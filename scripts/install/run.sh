#!/usr/bin/env bash
set -e

# Prints header
function printh {
    local input="$1"
    local len=$((${#1}+2))
    printf "\033[32m" # start green color
    printf "\n+"
    printf -- "-%.0s" $(seq 1 $len)
    printf "+\n| $input |\n+"
    printf -- "-%.0s" $(seq 1 $len)
    printf "+\n\n"
    printf "\033[0m" # end green color
}

function delete_dir {
    local dir="${1}"
    if [ -d ${dir} ]; then
        echo "deleting directory ./${dir}"
        rm -rf ${dir}
    fi
}

function cmd_clean {
    printh "Cleaning old spartacus installation workspace"

    delete_dir ${BASE_DIR}
    delete_dir storage

    yarn cache clean
}

function prepare_install {
    VERDACCIO_PID=`lsof -nP -i4TCP:4873 | grep LISTEN | tr -s ' ' | cut -d ' ' -f 2`
    if [[ -n ${VERDACCIO_PID} ]]; then
        echo "It seems Verdaccio is already running with PID: ${VERDACCIO_PID}. Killing it."
        kill ${VERDACCIO_PID}
    fi

    npm config set @spartacus:registry https://registry.npmjs.org/

    cmd_clean

    printh 'Installing packages for spartacus pre-installation'

    npm i -g verdaccio
    npm i -g serve
    npm i -g pm2
    npm i -g concurrently
    npm i -g @angular/cli@${ANGULAR_CLI_VERSION}

    mkdir -p ${INSTALLATION_DIR}
    ng analytics off
}

function clone_repo {
    printh "Cloning Spartacus installation repo."

    echo "Cloning from ${SPARTACUS_REPO_URL}"

    git clone -b ${BRANCH} ${SPARTACUS_REPO_URL} ${CLONE_DIR} --depth 1
}

function update_projects_versions {
    projects=$@
    if [[ "${SPARTACUS_VERSION}" == "next" ]] || [[ "${SPARTACUS_VERSION}" == "latest" ]]; then
        SPARTACUS_VERSION="999.999.999"
    fi
    for i in ${projects}
        do
            (cd "${CLONE_DIR}/${i}" && pwd && sed -i -E 's/"version": "[^"]+/"version": "'"${SPARTACUS_VERSION}"'/g' package.json);
        done
}

function install_from_npm {
    prepare_install

    create_apps
}

function create_shell_app {
    ( cd ${INSTALLATION_DIR} && ng new ${1} --style=scss --routing=false)
}

function add_b2b {
    if [ "${ADD_B2B_LIBS}" = true ] ; then
        ng add @spartacus/organization@${SPARTACUS_VERSION} --interactive false
    fi
}

function add_spartacus_csr {
    ( cd ${INSTALLATION_DIR}/${1} && ng add @spartacus/schematics@${SPARTACUS_VERSION} --overwriteAppComponent true --baseUrl ${BACKEND_URL} --occPrefix ${OCC_PREFIX} && ng add @spartacus/storefinder@${SPARTACUS_VERSION} --interactive false
    add_b2b
    )
}

function add_spartacus_ssr {
    ( cd ${INSTALLATION_DIR}/${1} && ng add @spartacus/schematics@${SPARTACUS_VERSION} --overwriteAppComponent true --baseUrl ${BACKEND_URL} --occPrefix ${OCC_PREFIX} --ssr && ng add @spartacus/storefinder@${SPARTACUS_VERSION} --interactive false
    add_b2b
    )
}

function add_spartacus_ssr_pwa {
    ( cd ${INSTALLATION_DIR}/${1} && cd ssr-pwa && ng add @spartacus/schematics@${SPARTACUS_VERSION} --overwriteAppComponent true --baseUrl ${BACKEND_URL} --occPrefix ${OCC_PREFIX} --ssr --pwa && ng add @spartacus/storefinder@${SPARTACUS_VERSION} --interactive false
    add_b2b
    )
}

function create_apps {
    if [ -z "${CSR_PORT}" ]; then
        echo "Skipping csr app install (no port defined)"
    else
        printh "Installing csr app"
        create_shell_app 'spartacus'
        add_spartacus_csr 'spartacus'
    fi
    if [ -z "${SSR_PORT}" ]; then
        echo "Skipping ssr app install (no port defined)"
    else
        printh "Installing ssr app"
        create_shell_app 'spartacus-ssr'
        add_spartacus_ssr 'spartacus-ssr'
    fi
    if [ -z "${SSR_PWA_PORT}" ]; then
        echo "Skipping ssr with pwa app install (no port defined)"
    else
        printh "Installing ssr app (with pwa support)"
        create_shell_app 'spartacus-ssr-pwa'
        add_spartacus_ssr_pwa 'spartacus-ssr-pwa'
    fi
}

function install_from_sources {
    printh "Installing with local @spartacus/*@${SPARTACUS_VERSION}"

    prepare_install

    npm set @spartacus:registry http://localhost:4873/

    clone_repo

    printh "Installing source dependencies."
    ( cd ${CLONE_DIR} && yarn install )

    printh "Building spa libraries from source."
    ( cd ${CLONE_DIR} && yarn build:libs)

    printh "Updating projects versions."
    update_projects_versions ${SPARTACUS_PROJECTS[@]}

    verdaccio --config ./config.yaml &

    VERDACCIO_PID=$!
    echo "verdaccio PID: ${VERDACCIO_PID}"

    sleep 45

    printh "Creating core npm package"
    ( cd ${CLONE_DIR}/dist/core && yarn publish --new-version=${SPARTACUS_VERSION} --registry=http://localhost:4873/ --no-git-tag-version )

    printh "Creating storefrontlib npm package"
    ( cd ${CLONE_DIR}/dist/storefrontlib && yarn publish --new-version=${SPARTACUS_VERSION} --registry=http://localhost:4873/ --no-git-tag-version )

    printh "Creating storefrontstyles npm package"
    ( cd ${CLONE_DIR}/projects/storefrontstyles && yarn publish --new-version=${SPARTACUS_VERSION} --registry=http://localhost:4873/ --no-git-tag-version )

    printh "Creating assets npm package"
    ( cd ${CLONE_DIR}/dist/assets && yarn publish --new-version=${SPARTACUS_VERSION} --registry=http://localhost:4873/ --no-git-tag-version )

    printh "Creating schematics npm package"
    ( cd ${CLONE_DIR}/projects/schematics && yarn && yarn build && yarn publish --new-version=${SPARTACUS_VERSION} --registry=http://localhost:4873/ --no-git-tag-version )

    printh "Creating cds npm package"
    ( cd ${CLONE_DIR}/dist/cds && yarn publish --new-version=${SPARTACUS_VERSION} --registry=http://localhost:4873/ --no-git-tag-version )

    printh "Creating setup npm package"
    ( cd ${CLONE_DIR}/dist/setup && yarn publish --new-version=${SPARTACUS_VERSION} --registry=http://localhost:4873/ --no-git-tag-version )

    printh "Creating organization npm package"
    ( cd ${CLONE_DIR}/dist/organization && yarn publish --new-version=${SPARTACUS_VERSION} --registry=http://localhost:4873/ --no-git-tag-version )

    printh "Creating storefinder npm package"
    ( cd ${CLONE_DIR}/dist/storefinder && yarn publish --new-version=${SPARTACUS_VERSION} --registry=http://localhost:4873/ --no-git-tag-version )

    create_apps

    sleep 5

    (kill ${VERDACCIO_PID} || echo "Verdaccio not running on PID ${VERDACCIO_PID}. Was it already runnig before starting the script?")

    npm set @spartacus:registry https://registry.npmjs.org/
    echo "Finished: npm @spartacus:registry set back to https://registry.npmjs.org/"
}

function build_csr {
    if [ -z "${CSR_PORT}" ]; then
        echo "Skipping csr app build"
    else
        printh "Building csr app"
        ( cd ${INSTALLATION_DIR}/spartacus && yarn build --prod )
    fi
}

function build_ssr {
    if [ -z "${SSR_PORT}" ]; then
        echo "Skipping ssr app build"
    else
        printh "Building ssr app"
        ( cd ${INSTALLATION_DIR}/spartacus-ssr && yarn build && yarn build:ssr )
    fi
}

function build_ssr_pwa {
    if [ -z "${SSR_PWA_PORT}" ]; then
        echo "Skipping ssr app build (with pwa support)"
    else
        printh "Building ssr app (with pwa support)"
        ( cd ${INSTALLATION_DIR}/spartacus-ssr-pwa && yarn build && yarn build:ssr )
    fi
}

function start_csr_unix {
    if [ -z "${CSR_PORT}" ]; then
        echo "Skipping csr app start"
    else
        build_csr
        printh "Starting csr app"
        pm2 start --name "csr-${CSR_PORT}" serve -- ${INSTALLATION_DIR}/spartacus/dist/spartacus/ --single -p ${CSR_PORT}
    fi
}

function start_ssr_unix {
     if [ -z "${SSR_PORT}" ]; then
        echo "Skipping ssr app start"
    else
        build_ssr
        printh "Starting ssr app"
        ( cd ${INSTALLATION_DIR}/spartacus-ssr && export PORT=${SSR_PORT} && export NODE_TLS_REJECT_UNAUTHORIZED=0 && pm2 start --name "ssr-${SSR_PORT}" dist/spartacus-ssr/server/main.js )
    fi
}

function start_ssr_pwa_unix {
     if [ -z "${SSR_PWA_PORT}" ]; then
        echo "Skipping ssr (with pwa support) app start"
    else
        build_ssr_pwa
        printh "Starting ssr app (with pwa support)"
        ( cd ${INSTALLATION_DIR}/ssr-pwa && export PORT=${SSR_PWA_PORT} && export NODE_TLS_REJECT_UNAUTHORIZED=0 && pm2 start --name "ssr-pwa-${SSR_PWA_PORT}" dist/spartacus-ssr-pwa/server/main.js )
    fi
}

function start_windows_apps {
    build_csr
    concurrently "serve ${INSTALLATION_DIR}/csr/dist/csr --single -p ${CSR_PORT}" --names "csr"
}

function start_apps {
    if [[ "${OSTYPE}" == "cygwin" ]]; then
        start_windows_apps
    elif [[ "${OSTYPE}" == "msys" ]]; then
        start_windows_apps
    elif [[ "${OSTYPE}" == "win32" ]]; then
        start_windows_apps
    else
        start_csr_unix
        start_ssr_unix
        start_ssr_pwa_unix
    fi
}

function stop_apps {
    pm2 stop "csr-${CSR_PORT}"
    pm2 stop "ssr-${SSR_PORT}"
    pm2 stop "ssr-pwa-${SSR_PORT}"
}

function run_e2e_tests {
    printh "Running e2e tests on app"
    pushd ${E2E_TEST_DIR} > /dev/null
    yarn
    popd > /dev/null
    pushd ${CLONE_DIR} > /dev/null
    yarn e2e:cy:run
    popd > /dev/null
}

function cmd_help {
    echo "Usage: run [command]"
    echo "Available commands are:"
    echo " install (from sources)"
    echo " install_npm (from latest npm packages)"
    echo " start"
    echo " stop"
    echo " e2e"
    echo " help"
}

if [ -z "${1}" ]; then
    cmd_help
    exit 1
fi

readonly commands="${1}"

if [ -f "./config.sh" ]; then
    echo "Config file ./config.sh found. Loading configurations"
    . ./config.sh
else
    echo "Custom config file not found. Loading configs from ./config.default.sh"
    . ./config.default.sh
fi

# top directory for the installation output (must be outside of the project)
if [ -z ${BASE_DIR} ]; then
    BASE_DIR="../../../spartacus-${SPARTACUS_VERSION}"
fi
CLONE_DIR="${BASE_DIR}/${CLONE_DIR}"
INSTALLATION_DIR="${BASE_DIR}/${INSTALLATION_DIR}"
E2E_TEST_DIR="${BASE_DIR}/${E2E_TEST_DIR}"

for current_command in $(echo "${commands}" | tr "+" "\n"); do

    case "${current_command}" in
        'install' )
            install_from_sources;;
        'install_npm' )
            install_from_npm;;
        'start' )
            start_apps;;
        'stop' )
            stop_apps;;
        'help' )
            cmd_help;;
        'e2e' )
            run_e2e_tests;;
        * )
            echo "Error: unknown command ${current_command}"
            cmd_help
            exit 1;;
    esac
done
