#!/bin/sh

if [ -z "$1" ]; then
	echo "usage: $0 project_dir" >&2
	exit 1
fi

mkdir "$1" || exit 1
cd "$1"

export PULUMI_CONFIG_PASSPHRASE="secret"

pulumi new -g aws-typescript -n $(basename "$PWD") -d "An AWS TypeScript Pulumi program"
npm install
echo ".pulumi" >> .gitignore
echo 'backend:\n  url: file://.' >> Pulumi.yaml
pulumi stack init playground
pulumi config set -s playground aws:region eu-central-1
