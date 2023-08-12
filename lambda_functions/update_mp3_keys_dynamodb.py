import json
import boto3


def lambda_handler(event, context):
    mp3_key = event['mp3Key']
    access_token = event['accessToken']
    filename = event['filename']

    cognito = boto3.client('cognito-idp')

    # Get the user information from Cognito using the access token
    cognito_response = cognito.get_user(
        AccessToken=access_token)

    # Get the user from the Cognito response
    user = cognito_response['UserAttributes'][-1]['Value']

    dynamodb = boto3.client('dynamodb')

    # Add the user, mp3 key, and filename to the DynamoDB table for authorized users
    dynamodb_put_response = dynamodb.put_item(
        TableName='mp3KeysAuthorisedUsers',
        Item={
            "User": {"S": user},
            "Mp3Key": {"S": mp3_key},
            "Filename": {"S": filename}
        }
    )

    # Delete the mp3 key from the DynamoDB table for anonymous users if exists
    dynamodb_delete_response = dynamodb.delete_item(
        TableName='mp3KeysAnonymousUsers',
        Key={
            'Mp3Key': {'S': mp3_key}
        }
    )

    # Return a response with the status code, user information, and DynamoDB responses
    return {
        'statusCode': 200,
        'body': json.dumps({'response': {'userPutRes': dynamodb_put_response, 'anonymousDelRes': dynamodb_delete_response}, 'user': user})
    }
