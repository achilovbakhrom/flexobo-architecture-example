#!/bin/bash
# Create the S3 bucket for file storage
awslocal s3 mb s3://flexobo-files
awslocal s3api put-bucket-acl --bucket flexobo-files --acl public-read
echo "S3 bucket 'flexobo-files' created successfully"
