import json
import boto3
from botocore.exceptions import ClientError
from string import ascii_letters
from random import choice


def lambda_handler(event, context):
    s3_client = boto3.client('s3')

    key = event['key']
    method = event['request_method']
    file_type = event['file_type']
    filename = event['filename']

    # If the key is not provided, generate a new key
    if not key:
        key = generate_key()

    # Create a folder and bucket key based on the file type
    folder = f'{file_type}files'
    bucket_key = f'{folder}/{key}.{file_type}'

    # Set the method parameters for the S3 client
    method_parameters = {'Bucket': 'pdfaudiobucket',
                         'Key': bucket_key
                         }

    # Check the request method
    if method == 'GET':
        # If the method is GET, set the client method to 'get_object', set content to mp3
        client_method = 'get_object'
        method_parameters[
            'ResponseContentDisposition'] = f"attachment; filename={filename}.mp3"
        method_parameters['ResponseContentType'] = "audio/mpeg3"
    elif method == 'PUT':
        # If the method is PUT, set the client method to 'put_object'
        client_method = 'put_object'

    # Generate a presigned URL for the S3 client
    url = generate_presigned_url(
        s3_client=s3_client,
        client_method=client_method,
        method_parameters=method_parameters,
        expires_in=1200,
    )

    # Return the response
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin':  '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type, Accept',
            'Content-Type': 'application/json',
        },
        'body': json.dumps({'url': url, 'key': key}, separators=(',', ':'), default='str')
    }


def generate_presigned_url(s3_client, client_method, method_parameters, expires_in):
    """
    Generate a presigned S3 on Outposts URL that can be used to perform an action.

    :param s3_client: A Boto3 Amazon S3 client.
    :param client_method: The name of the client method that the URL performs.
    :param method_parameters: The parameters of the specified client method.
    :param expires_in: The number of seconds that the presigned URL is valid for.
    :return: The presigned URL.
    """
    try:
        url = s3_client.generate_presigned_url(
            ClientMethod=client_method,
            Params=method_parameters,
            ExpiresIn=expires_in,
        )
        print("Got presigned URL: %s", url)
    except ClientError:
        print(
            "Couldn't get a presigned URL for client method '%s'.", client_method)
        raise
    return url


def generate_key():
    key = ''.join(choice(ascii_letters) for i in range(10))
    print(key)
    return key
