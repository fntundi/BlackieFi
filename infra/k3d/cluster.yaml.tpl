apiVersion: k3d.io/v1alpha5
kind: Simple
metadata:
  name: __CLUSTER_NAME__
servers: __K3D_SERVERS__
agents: __K3D_AGENTS__
ports:
  - port: __HTTP_PORT__:80
    nodeFilters:
      - loadbalancer
  - port: __HTTPS_PORT__:443
    nodeFilters:
      - loadbalancer
