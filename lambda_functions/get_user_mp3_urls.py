import boto3
from boto3.dynamodb.conditions import Key


def lambda_handler(event, context):
    """
    Retrieves presigned URLs for authorized users to access MP3 files.

    Returns:
        dict: A dictionary containing the status code and a list of presigned URLs, MP3 keys, and filenames.
    """

    access_token = event['accessToken']

    cognito = boto3.client('cognito-idp')

    # Get the user information using the access token
    cognito_response = cognito.get_user(AccessToken=access_token)

    # Extract the user attribute value
    user = cognito_response['UserAttributes'][-1]['Value']

    print(user)

    client = boto3.resource('dynamodb')

    # Get the DynamoDB table
    table = client.Table('mp3KeysAuthorisedUsers')

    # Query the table for items with the specified user
    res = table.query(KeyConditionExpression=Key('User').eq(user))

    # Get the items from the query response
    user_items = res['Items']

    print(user_items)

    s3 = boto3.client('s3')

    # Initialize a list to store the presigned URL dictionaries
    url_key_dictionaries = []

    # Generate presigned URLs for each user item
    for item in user_items:
        key = item['Mp3Key']
        bucket_key = f'mp3files/{key}.mp3'

        # Generate a presigned URL for the S3 object
        url = s3.generate_presigned_url(ClientMethod='get_object',
                                        Params={'Bucket': 'pdfaudiobucket',
                                                'Key': bucket_key},
                                        ExpiresIn=1200)

        # Get the filename from the user item
        filename = item['Filename']

        # Create a dictionary with the presigned URL, MP3 key, and filename
        url_key_dict = {"presignedUrl": url,
                        "mp3Key": key, "filename": filename}

        # Add the dictionary to the list
        url_key_dictionaries.append(url_key_dict)

    # Return the status code and the list of presigned URL dictionaries
    return {
        'statusCode': 200,
        'body': url_key_dictionaries
    }
