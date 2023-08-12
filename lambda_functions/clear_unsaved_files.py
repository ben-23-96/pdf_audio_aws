import json
import boto3


def lambda_handler(event, context):
    # get all anonymous keys for deletion from dynamo table
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('mp3KeysAnonymousUsers')
    response = table.scan()
    dbitems = response['Items']

    print(dbitems)

    # create list of s3 keys of mp3s for deletion
    s3keys = [{'Key': f"mp3files/{item['Mp3Key']}.mp3"} for item in dbitems]

    print(s3keys)

    # delete mp3s that are not saved by a registered user from s3
    if s3keys:
        s3_client = boto3.client('s3')
        s3_mp3_delete_response = s3_client.delete_objects(
            Bucket='pdfaudiobucket',
            Delete={'Objects': s3keys}
        )
        print(s3_mp3_delete_response)

    # delete all pdfs from s3
    s3_resource = boto3.resource('s3')
    bucket = s3_resource.Bucket('pdfaudiobucket')
    s3_pdf_delete_response = bucket.objects.filter(Prefix="pdffiles/").delete()

    print(s3_pdf_delete_response)

    # delete keys of deleted mp3s from dynamodb table
    if dbitems:
        with table.batch_writer() as batch:
            for item in dbitems:
                dynamo_delete_response = batch.delete_item(Key={
                    "Mp3Key": item["Mp3Key"],
                })

        print(dynamo_delete_response)

    return {
        'statusCode': 200,
        'body': json.dumps('Hello from Lambda!')
    }
