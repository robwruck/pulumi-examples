#!/bin/bash

function get-account-id {
	aws sts get-caller-identity | jq -r '.Account'
}

function list-objects {
	echo "Listing $1"
	aws s3api list-objects-v2 --bucket "$1"
}

function get-object {
	echo "Fetching $1/$2"
	aws s3api get-object --bucket "$1" --key "$2" /dev/fd/3 3>&1 1>/dev/null
	echo
}

if [ -z "$1" ]; then
	echo "usage: $0 bucket_name" >&2
	exit 1
fi

ACCOUNT_ID=$(get-account-id) || exit 1

list-objects "$1"
list-objects "arn:aws:s3:eu-central-1:$ACCOUNT_ID:accesspoint/objectlambda-ap"
list-objects "arn:aws:s3-object-lambda:eu-central-1:$ACCOUNT_ID:accesspoint/objectlambda-olap"

get-object "$1" "hello.txt"
get-object "arn:aws:s3:eu-central-1:$ACCOUNT_ID:accesspoint/objectlambda-ap" "hello.txt"
get-object "arn:aws:s3-object-lambda:eu-central-1:$ACCOUNT_ID:accesspoint/objectlambda-olap" "hello.txt"
