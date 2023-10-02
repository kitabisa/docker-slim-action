# Docker Slim GitHub Action [![tests](https://github.com/kitabisa/docker-slim-action/actions/workflows/test.yaml/badge.svg)](https://github.com/kitabisa/docker-slim-action/actions/workflows/test.yaml)

This GitHub Action helps you to minify your container image, making it smaller and more secure. With this Action, you can reduce the size of your container image by up to **30x** _(and even more for compiled languages)_ without compromising its functionality.

## What does this Action do?

This GitHub Action uses [slimtoolkit/slim](https://github.com/slimtoolkit/slim) to minimize your container image. `slim` is an open-source tool that removes unnecessary files and libraries from your image, resulting in a smaller and more secure container.

Slim uses static and dynamic analysis techniques to identify the components of your image that are not needed at runtime. It also removes debug symbols, unused files, and libraries that are not required by your application, reducing the size of your image.

See [their README](https://github.com/slimtoolkit/slim#overview) for more information about how Slim works.

## Setup

To use this GitHub Action, you will need to have the [docker/login-action](https://github.com/docker/login-action) or [docker/build-push-action](https://github.com/docker/build-push-action) set up in your workflow as well. These actions will allow you to execute Docker commands needed for this action to run successfully.

## Usage

### Example

Create a workflow file in your repository and add these steps to your job:

```yaml
      # Build the Docker image first
      - uses: docker/build-push-action@v4
        with:
          push: false
          tags: ${{ github.repository }}:latest

      # Slim it!
      - uses: kitabisa/docker-slim-action@v1
        env:
          DSLIM_HTTP_PROBE: false
        with:
          target: ${{ github.repository }}:latest
          tag: "slim"

      # Push to the registry
      - run: docker image push "${{ github.repository }}" --all-tags
```

In this example, it will minify `${{ github.repository }}:latest` as target and will create a slimmed version of the target image with the **slim** tag from the input (`${{ github.repository }}:slim`) then push the images to the registry.

## Inputs

The following input actions are supported:

| Name        | Description                                                                      | Required? | Type    | Default |
|-------------|----------------------------------------------------------------------------------|-----------|---------|---------|
| `overwrite` | Overwrite target container image with slimmed version (only if target is not ID) | 🔴        | boolean | false   |
| `tag`       | Specify a tag for slimmed target container image                                 | 🟢        | string  | slim    |
| `target`    | Target container image (name or ID)                                              | 🟢        | string  |         |
| `version`   | Define Slim version                                                              | 🔴        | string  |         |

> **Warning**
> Enabling the `overwrite` option will result in the replacement of the target image (original) with its slimmed version, regardless of the `tag` input.

<details>
  <summary>You can also control the behavior of the Slim build command by setting the following environment variables:</summary>

| Environment | Description |
|-------------|-------------|
| `DSLIM_PULL` | Try pulling target if it's not available locally (default: false) |
| `DSLIM_DOCKER_CONFIG_PATH` | Docker config path (used to fetch registry credentials) |
| `DSLIM_REGISTRY_ACCOUNT` | Target registry account used when pulling images from private registries |
| `DSLIM_REGISTRY_SECRET` | Target registry secret used when pulling images from private registries |
| `DSLIM_PLOG` | Show image pull logs (default: false) |
| `DSLIM_COMPOSE_FILE` | Load container info from selected compose file(s) |
| `DSLIM_TARGET_COMPOSE_SVC` | Target service from compose file |
| `DSLIM_TARGET_COMPOSE_SVC_IMAGE` | Override the container image name and/or tag when targetting a compose service using the target-compose-svc parameter (format: tag_name or image_name:tag_name) |
| `DSLIM_COMPOSE_SVC_START_WAIT` | Number of seconds to wait before starting each compose service (default: 0) |
| `DSLIM_COMPOSE_SVC_NO_PORTS` | Do not publish ports for target service from compose file (default: false) |
| `DSLIM_DEP_INCLUDE_COMPOSE_SVC_ALL` | Do not start any compose services as target dependencies (default: false) |
| `DSLIM_DEP_INCLUDE_COMPOSE_SVC` | Include specific compose service as a target dependency (only selected services will be started) |
| `DSLIM_DEP_EXCLUDE_COMPOSE_SVC` | Exclude specific service from the compose services that will be started as target dependencies |
| `DSLIM_DEP_INCLUDE_COMPOSE_SVC_DEPS` | Include all dependencies for the selected compose service (excluding the service itself) as target dependencies |
| `DSLIM_DEP_INCLUDE_TARGET_COMPOSE_SVC_DEPS` | Include all dependencies for the target compose service (excluding the service itself) as target dependencies (default: false) |
| `DSLIM_COMPOSE_NET` | Attach target to the selected compose network(s) otherwise all networks will be attached |
| `DSLIM_COMPOSE_ENV_NOHOST` | Don't include the env vars from the host to compose (default: false) |
| `DSLIM_COMPOSE_ENV_FILE` | Load compose env vars from file (host env vars override the values loaded from this file) |
| `DSLIM_COMPOSE_PROJECT_NAME` | Use custom project name for compose |
| `DSLIM_COMPOSE_WORKDIR` | Set custom work directory for compose |
| `DSLIM_CONTAINER_PROBE_COMPOSE_SVC` | Container test/probe service from compose file |
| `DSLIM_HOST_EXEC` | Host commands to execute (aka host commands probes) |
| `DSLIM_HOST_EXEC_FILE` | Host commands to execute loaded from file (aka host commands probes) |
| `DSLIM_TARGET_KUBE_WORKLOAD` | [Experimental] Target Kubernetes workload from the manifests (if is provided) or in the default kubeconfig cluster (format: <resource>/<name>, e.g., deployments/foobar) |
| `DSLIM_TARGET_KUBE_WORKLOAD_NAMESPACE` | [Experimental] Target Kubernetes workload namespace (if not set, the value from the manifest is used if provided, otherwise - "default") |
| `DSLIM_TARGET_KUBE_WORKLOAD_CONTAINER` | [Experimental] Target container in the Kubernetes workload's pod template spec |
| `DSLIM_TARGET_KUBE_WORKLOAD_IMAGE` | [Experimental] Override the container image name and/or tag when targetting a Kubernetes workload (format: tag_name or image_name:tag_name) |
| `DSLIM_KUBE_MANIFEST_FILE` | [Experimental] Kubernetes manifest(s) to apply before run |
| `DSLIM_KUBE_KUBECONFIG_FILE, $KUBECONFIG` | [Experimental] Path to the kubeconfig file (default: "/home/dw1/.kube/config") |
| `DSLIM_PUBLISH_PORT` | Map container port to host port (format => port | hostPort:containerPort | hostIP:hostPort:containerPort | hostIP::containerPort ) |
| `DSLIM_PUBLISH_EXPOSED` | Map all exposed ports to the same host ports (default: false) |
| `DSLIM_RUN_TAS_USER` | Run target app as USER (default: true) |
| `DSLIM_SHOW_CLOGS` | Show container logs (default: false) |
| `DSLIM_SHOW_BLOGS` | Show image build logs (default: false) |
| `DSLIM_CP_META_ARTIFACTS` | copy metadata artifacts to the selected location when command is done |
| `DSLIM_RM_FILE_ARTIFACTS` | remove file artifacts when command is done (default: false) |
| `DSLIM_RC_EXE` | A shell script snippet to run via Docker exec |
| `DSLIM_RC_EXE_FILE` | A shell script file to run via Docker exec |
| `DSLIM_TARGET_TAG` | Custom tags for the generated image |
| `DSLIM_TARGET_OVERRIDES` | Save runtime overrides in generated image (values is 'all' or a comma delimited list of override types: 'entrypoint', 'cmd', 'workdir', 'env', 'expose', 'volume', 'label') |
| `DSLIM_CRO_RUNTIME` | Runtime to use with the created containers |
| `DSLIM_CRO_HOST_CONFIG_FILE` | Base Docker host configuration file (JSON format) to use when running the container |
| `DSLIM_CRO_SYSCTL` | Set namespaced kernel parameters in the created container |
| `DSLIM_CRO_SHM_SIZE` | Shared memory size for /dev/shm in the created container (default: -1) |
| `DSLIM_RC_USER` | Override USER analyzing image at runtime |
| `DSLIM_RC_ENTRYPOINT` | Override ENTRYPOINT analyzing image at runtime. To persist ENTRYPOINT changes in the output image, pass the --image-overrides=entrypoint or --image-overrides=all flag as well. |
| `DSLIM_RC_CMD` | Override CMD analyzing image at runtime. To persist CMD changes in the output image, pass the --image-overrides=cmd or --image-overrides=all flag as well. |
| `DSLIM_RC_WORKDIR` | Override WORKDIR analyzing image at runtime. To persist WORKDIR changes in the output image, pass the --image-overrides=workdir or --image-overrides=all flag as well. |
| `DSLIM_RC_ENV` | Override or add ENV only during runtime. To persist ENV additions or changes in the output image, pass the --image-overrides=env or --image-overrides=all flag as well. |
| `DSLIM_RC_LABEL` | Override or add LABEL analyzing image at runtime. To persist LABEL additions or changes in the output image, pass the --image-overrides=label or --image-overrides=all flag as well. |
| `DSLIM_RC_VOLUME` | Add VOLUME analyzing image at runtime. To persist VOLUME additions in the output image, pass the --image-overrides=volume or --image-overrides=all flag as well. |
| `DSLIM_RC_LINK` | Add link to another container analyzing image at runtime |
| `DSLIM_RC_ETC_HOSTS_MAP` | Add a host to IP mapping to /etc/hosts analyzing image at runtime |
| `DSLIM_RC_DNS` | Add a dns server analyzing image at runtime |
| `DSLIM_RC_DNS_SEARCH` | Add a dns search domain for unqualified hostnames analyzing image at runtime |
| `DSLIM_RC_NET` | Override default container network settings analyzing image at runtime |
| `DSLIM_RC_HOSTNAME` | Override default container hostname analyzing image at runtime |
| `DSLIM_RC_EXPOSE` | Use additional EXPOSE instructions analyzing image at runtime. To persist EXPOSE additions in the output image, pass the --image-overrides=expose or --image-overrides=all flag as well. |
| `DSLIM_MOUNT` | Mount volume analyzing image |
| `DSLIM_IMAGE_BUILD_ENG` | Select image build engine: internal | docker | none (default: "docker") |
| `DSLIM_IMAGE_BUILD_ARCH` | Select output image build architecture |
| `DSLIM_BUILD_DOCKERFILE` | The source Dockerfile name to build the fat image before it's optimized |
| `DSLIM_BUILD_DOCKERFILE_CTX` | The build context directory when building source Dockerfile |
| `DSLIM_TARGET_TAG_FAT` | Custom tag for the fat image built from Dockerfile |
| `DSLIM_CBO_ADD_HOST` | Add an extra host-to-IP mapping in /etc/hosts to use when building an image |
| `DSLIM_CBO_BUILD_ARG` | Add a build-time variable |
| `DSLIM_CBO_CACHE_FROM` | Add an image to the build cache |
| `DSLIM_CBO_LABEL` | Add a label when building from Dockerfiles |
| `DSLIM_CBO_TARGET` | Target stage to build for multi-stage Dockerfiles |
| `DSLIM_CBO_NETWORK` | Networking mode to use for the RUN instructions at build-time |
| `DSLIM_DELETE_FAT` | Delete generated fat image requires flag (default: false) |
| `DSLIM_NEW_ENTRYPOINT` | New ENTRYPOINT instruction for the optimized image |
| `DSLIM_NEW_CMD` | New CMD instruction for the optimized image |
| `DSLIM_NEW_EXPOSE` | New EXPOSE instructions for the optimized image |
| `DSLIM_NEW_WORKDIR` | New WORKDIR instruction for the optimized image |
| `DSLIM_NEW_ENV` | New ENV instructions for the optimized image |
| `DSLIM_NEW_VOLUME` | New VOLUME instructions for the optimized image |
| `DSLIM_NEW_LABEL` | New LABEL instructions for the optimized image |
| `DSLIM_RM_EXPOSE` | Remove EXPOSE instructions for the optimized image |
| `DSLIM_RM_ENV` | Remove ENV instructions for the optimized image |
| `DSLIM_RM_LABEL` | Remove LABEL instructions for the optimized image |
| `DSLIM_RM_VOLUME` | Remove VOLUME instructions for the optimized image |
| `DSLIM_EXCLUDE_MOUNTS` | Exclude mounted volumes from image (default: true) |
| `DSLIM_EXCLUDE_PATTERN` | Exclude path pattern (Glob/Match in Go and **) from image |
| `DSLIM_PRESERVE_PATH` | Keep path from orignal image in its initial state (changes to the selected container image files when it runs will be discarded) |
| `DSLIM_PRESERVE_PATH_FILE` | File with paths to keep from original image in their original state (changes to the selected container image files when it runs will be discarded) |
| `DSLIM_INCLUDE_PATH` | Keep path from original image |
| `DSLIM_INCLUDE_PATH_FILE` | File with paths to keep from original image |
| `DSLIM_INCLUDE_BIN` | Keep binary from original image (executable or shared object using its absolute path) |
| `DSLIM_INCLUDE_BIN_FILE` | File with shared binary file names to include from image |
| `DSLIM_INCLUDE_EXE_FILE` | File with executable file names to include from image |
| `DSLIM_INCLUDE_EXE` | Keep executable from original image (by executable name) |
| `DSLIM_INCLUDE_SHELL` | Keep basic shell functionality (default: false) |
| `DSLIM_INCLUDE_PATHS_CREPORT_FILE` | Keep files from the referenced creport |
| `DSLIM_INCLUDE_OSLIBS_NET` | Keep the common networking OS libraries (default: true) |
| `DSLIM_INCLUDE_CERT_ALL` | Keep all discovered cert files (default: true) |
| `DSLIM_INCLUDE_CERT_BUNDLES` | Keep only cert bundles (default: false) |
| `DSLIM_INCLUDE_CERT_DIRS` | Keep known cert directories and all files in them (default: false) |
| `DSLIM_INCLUDE_CERT_PK_ALL` | Keep all discovered cert private keys (default: false) |
| `DSLIM_INCLUDE_CERT_PK_DIRS` | Keep known cert private key directories and all files in them (default: false) |
| `DSLIM_INCLUDE_NEW` | Keep new files created by target during dynamic analysis (default: true) |
| `DSLIM_KEEP_TMP_ARTIFACTS` | Keep temporary artifacts when command is done (default: false) |
| `DSLIM_INCLUDE_APP_NUXT_DIR` | Keep the root Nuxt.js app directory (default: false) |
| `DSLIM_INCLUDE_APP_NUXT_BUILD_DIR` | Keep the build Nuxt.js app directory (default: false) |
| `DSLIM_INCLUDE_APP_NUXT_DIST_DIR` | Keep the dist Nuxt.js app directory (default: false) |
| `DSLIM_INCLUDE_APP_NUXT_STATIC_DIR` | Keep the static asset directory for Nuxt.js apps (default: false) |
| `DSLIM_INCLUDE_APP_NUXT_NM_DIR` | Keep the node modules directory for Nuxt.js apps (default: false) |
| `DSLIM_INCLUDE_APP_NEXT_DIR` | Keep the root Next.js app directory (default: false) |
| `DSLIM_INCLUDE_APP_NEXT_BUILD_DIR` | Keep the build directory for Next.js app (default: false) |
| `DSLIM_INCLUDE_APP_NEXT_DIST_DIR` | Keep the static SPA directory for Next.js apps (default: false) |
| `DSLIM_INCLUDE_APP_NEXT_STATIC_DIR` | Keep the static public asset directory for Next.js apps (default: false) |
| `DSLIM_INCLUDE_APP_NEXT_NM_DIR` | Keep the node modules directory for Next.js apps (default: false) |
| `DSLIM_INCLUDE_NODE_PKG` | Keep node.js package by name |
| `DSLIM_KEEP_PERMS` | Keep artifact permissions as-is (default: true) |
| `DSLIM_PATH_PERMS` | Set path permissions in optimized image |
| `DSLIM_PATH_PERMS_FILE` | File with path permissions to set |
| `DSLIM_CONTINUE_AFTER` | Select continue mode: enter | signal | probe | timeout-number-in-seconds | container.probe (default: "probe") |
| `DSLIM_USE_LOCAL_MOUNTS` | Mount local paths for target container artifact input and output (default: false) |
| `DSLIM_USE_SENSOR_VOLUME` | Sensor volume name to use |
| `DSLIM_RTA_ONBUILD_BI` | Enable runtime analysis for onbuild base images (default: false) |
| `DSLIM_RTA_SRC_PT` | Enable PTRACE runtime analysis source (default: true) |
| `DSLIM_SENSOR_IPC_ENDPOINT` | Override sensor IPC endpoint |
| `DSLIM_SENSOR_IPC_MODE` | Select sensor IPC mode: proxy | direct |
| `DSLIM_HTTP_PROBE_OFF` | Alternative way to disable HTTP probing (default: false) |
| `DSLIM_HTTP_PROBE` | Enable or disable HTTP probing (default: true) |
| `DSLIM_HTTP_PROBE_CMD` | User defined HTTP probes |
| `DSLIM_HTTP_PROBE_CMD_FILE` | File with user defined HTTP probes |
| `DSLIM_HTTP_PROBE_START_WAIT` | Number of seconds to wait before starting HTTP probing (default: 0) |
| `DSLIM_HTTP_PROBE_RETRY_COUNT` | Number of retries for each HTTP probe (default: 5) |
| `DSLIM_HTTP_PROBE_RETRY_WAIT` | Number of seconds to wait before retrying HTTP probe (doubles when target is not ready) (default: 8) |
| `DSLIM_HTTP_PROBE_PORTS` | Explicit list of ports to probe (in the order you want them to be probed) |
| `DSLIM_HTTP_PROBE_FULL` | Do full HTTP probe for all selected ports (if false, finish after first successful scan) (default: false) |
| `DSLIM_HTTP_PROBE_EXIT_ON_FAILURE` | Exit when all HTTP probe commands fail (default: true) |
| `DSLIM_HTTP_PROBE_CRAWL` | http-probe-crawl (default: true) |
| `DSLIM_HTTP_CRAWL_MAX_DEPTH` | Max depth to use for the HTTP probe crawler (default: 3) |
| `DSLIM_HTTP_CRAWL_MAX_PAGE_COUNT` | Max number of pages to visit for the HTTP probe crawler (default: 1000) |
| `DSLIM_HTTP_CRAWL_CONCURRENCY` | Number of concurrent workers when crawling an HTTP target (default: 10) |
| `DSLIM_HTTP_MAX_CONCURRENT_CRAWLERS` | Number of concurrent crawlers in the HTTP probe (default: 1) |
| `DSLIM_HTTP_PROBE_API_SPEC` | Run HTTP probes for API spec |
| `DSLIM_HTTP_PROBE_API_SPEC_FILE` | Run HTTP probes for API spec from file |
</details>

> **Note**
> Please note that when you disable HTTP probing (either by setting `DSLIM_HTTP_PROBE_OFF` to `true` or `DSLIM_HTTP_PROBE` to `false`), it will effectively modify the behavior of the continue mode (if the `DSLIM_CONTINUE_AFTER` value is undefined) by imposing a timeout of **1** second. This adjustment occurs because, by default, when HTTP probes are disabled, the Slim's behavior will switch to '**enter**' mode — and there is no way to interact with the temporary container created by Slim within the GitHub Action runner.

## Outputs

To view the report results generated by the Slim build command, you can access the `report` property (`Object`) of the `steps` outputs context. Here's an example of how to access it: `${{ steps.<id>.outputs.report }}`.

```yaml
      # Slim it!
      - uses: kitabisa/docker-slim-action@v1
        id: slim
        env:
          DSLIM_HTTP_PROBE: false
        with:
          target: ${{ github.repository }}:latest

      # Dump the report
      - run: echo "${REPORT}"
        env:
          REPORT: ${{ steps.slim.outputs.report }}
```

## License

The associated scripts and documentation in this project are released under the MIT License.

Binary used in this project include third party materials.
