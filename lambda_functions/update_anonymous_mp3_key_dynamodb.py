import json
import boto3


def lambda_handler(event, context):
    """adds the s3 bucket key of a mp3 and filename to table for users not signed in, to be used in case the user then signs in and wants to save"""
    mp3_key = event['mp3Key']
    filename = event['filename']

    dynamodb = boto3.client('dynamodb')

    dynamodb_put_response = dynamodb.put_item(
        TableName='mp3KeysAnonymousUsers',
        Item={
            'Mp3Key': {'S': mp3_key},
            'Filename': {'S': filename}
        }
    )
    return {
        'statusCode': 200,
        'body': json.dumps({'response': dynamodb_put_response})
    }
