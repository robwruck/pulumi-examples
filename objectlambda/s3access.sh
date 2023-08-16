#!/bin/sh

get_account_id() {
	aws sts get-caller-identity | jq -r '.Account'
}

list_objects() {
	echo "Listing $1"
	aws s3api list-objects-v2 --bucket "$1"
}

get_object() {
	echo "Fetching $1/$2"
	aws s3api get-object --bucket "$1" --key "$2" /dev/fd/3 3>&1 1>/dev/null
	echo
}

if [ -z "$1" ]; then
	echo "usage: $0 bucket_name" >&2
	exit 1
fi

ACCOUNT_ID=$(get_account_id) || exit 1

list_objects "$1"
list_objects "arn:aws:s3:eu-central-1:$ACCOUNT_ID:accesspoint/objectlambda-ap"
list_objects "arn:aws:s3-object-lambda:eu-central-1:$ACCOUNT_ID:accesspoint/objectlambda-olap"

get_object "$1" "hello.txt"
get_object "arn:aws:s3:eu-central-1:$ACCOUNT_ID:accesspoint/objectlambda-ap" "hello.txt"
get_object "arn:aws:s3-object-lambda:eu-central-1:$ACCOUNT_ID:accesspoint/objectlambda-olap" "hello.txt"
