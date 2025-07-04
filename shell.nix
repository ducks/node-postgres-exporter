{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  name = "node-postgres-exporter-dev";

  buildInputs = [
    pkgs.nodejs       # Stable Node.js with npm bundled
    pkgs.docker
    pkgs.docker-compose
  ];

  shellHook = ''
    echo "Node.js dev shell ready (npm included)."
    echo "Use 'npm install' to set up your dependencies."
  '';
}
