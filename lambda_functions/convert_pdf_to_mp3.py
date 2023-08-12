import boto3
import json
from botocore.exceptions import BotoCoreError, ClientError
from contextlib import closing
from pdf2image import convert_from_bytes
import tempfile
import os
import traceback
from time import sleep


def lambda_handler(event, context):
    key = event['key']
    pages = event['pages']

    try:
        # Convert the PDF to text
        text = convert_pdf_to_text(key=key, pages=pages)

        aws_polly = AWSPolly()

        # Convert the text to audio
        key = aws_polly.convert_text_to_audio(text=text, key=key)
    except Exception as e:
        # If an exception occurs, set the status code to 400
        status = 400

        # Format the exception traceback and store it in the 'error_traceback' variable
        lines = traceback.format_exception(type(e), e, e.__traceback__)
        error_traceback = ''.join(lines)

        # Create a dictionary with the error traceback
        body = {"error": error_traceback}
    else:
        # If no exception occurs, set the status code to 200
        status = 200

        # Create a dictionary with the 'key' value
        body = {"key": key}

    # Return a dictionary with the status code and body as a JSON string
    return {
        'statusCode': status,
        'body': json.dumps(body)
    }


def convert_pdf_to_text(key, pages):
    textract = boto3.client("textract")
    s3 = boto3.resource("s3")
    # Get the PDF object from S3
    pdf_obj = s3.Object('pdfaudiobucket', f'pdffiles/{key}.pdf')
    # Read the PDF bytes
    pdf_bytes = pdf_obj.get()["Body"].read()

    # Convert the PDF to a list of JPEG images
    jpg_image_list = convert_from_bytes(pdf_bytes)

    # Get the page range to extract text from
    page_from = pages['pageFrom']
    page_to = pages['pageTo']

    # Select the pages to extract text from
    if page_from == page_to:
        selected_pages = [jpg_image_list[page_from-1]]
    else:
        selected_pages = jpg_image_list[page_from-1:page_to]

    # Initialize an empty string to store the extracted text
    extracted_text = ""

    # Iterate through the selected pages
    for page in selected_pages:
        # Create a temporary directory
        with tempfile.TemporaryDirectory() as td:
            # Create a temporary file path
            temp_file = os.path.join(td, 'temp')
            # Save the page as a JPEG image
            page.save(temp_file, 'JPEG')
            # Open the temporary file in binary mode
            with open(temp_file, 'rb') as fh:
                # Read the JPEG image bytes
                jpg = fh.read()
                # Use Textract to detect text in the image
                textract_response = textract.detect_document_text(
                    Document={
                        'Bytes': jpg
                    }
                )
                # Iterate through the blocks of text detected by Textract
                for block in textract_response['Blocks']:
                    # Check if the block contains text
                    if 'Text' in block:
                        # Get the text from the block
                        text = block['Text']
                        # Add the text to the extracted_text string
                        extracted_text += f' {text}'

    # Return the extracted text
    return extracted_text


class AWSPolly:
    def __init__(self):
        self.polly_client = boto3.client('polly')
        self.s3_client = boto3.client('s3')

        self.text = ""
        self.key = ""

    def convert_text_to_audio(self, text, key):
        # Set the text and key variables
        self.text = text
        self.key = key

        # Check if the length of the text is greater than 3000 characters
        if len(text) > 3000:
            print('greater than')
            # Call the start_speech_synthesis method
            self.start_speech_synthesis()
        else:
            print('less than')
            # Call the synthesis_speech method
            self.synthesis_speech()

        # Return the key
        return self.key

    def synthesis_speech(self):
        """
    Synthesizes speech using Amazon Polly API.
    Saves the synthesized audio file to an S3 bucket.
    """
        try:
            # Call Amazon Polly API to synthesize speech
            response = self.polly_client.synthesize_speech(
                Text=self.text, OutputFormat="mp3", VoiceId="Nicole")
        except (BotoCoreError, ClientError) as error:
            # The service returned an error
            raise error

        if "AudioStream" in response:
            with closing(response["AudioStream"]) as stream:
                try:
                    # Save the audio file to S3 bucket
                    self.s3_client.put_object(
                        Body=stream.read(), Bucket='pdfaudiobucket', Key=f'mp3files/{self.key}.mp3')
                except IOError as error:
                    # Could not write to file
                    raise error
        else:
            # The response didn't contain audio data
            raise Exception("The response didn't contain audio data")

        return

    def start_speech_synthesis(self):
        """
    This function starts the speech synthesis task using the Amazon Polly service.
    It takes the input text, output format, voice ID, and S3 bucket details as parameters.
    It returns the speech task ID and waits for the synthesis task to complete.
    """

        try:
            # Start the speech synthesis task
            response = self.polly_client.start_speech_synthesis_task(
                Text=self.text,  # Input text to be synthesized
                OutputFormat="mp3",  # Output format of the synthesized speech
                VoiceId="Nicole",  # Voice ID for the synthesized speech
                OutputS3BucketName="pdfaudiobucket",  # S3 bucket name for the output file
                OutputS3KeyPrefix="mp3files/"  # Prefix for the output file name
            )
        except (BotoCoreError, ClientError) as error:
            # Handle any errors returned by the service
            raise error

        # Get the speech task ID from the response
        speech_task_id = response['SynthesisTask']['TaskId']
        print(speech_task_id)

        # Wait for the synthesis task to complete
        self.await_synthesis_completion(task_id=speech_task_id)

    def await_synthesis_completion(self, task_id):
        # Get the speech synthesis task status
        res = self.polly_client.get_speech_synthesis_task(
            TaskId=task_id)
        # Get the task status from the response
        task_status = res['SynthesisTask']['TaskStatus']

        # Check if the task is completed
        if task_status == 'completed':
            print('completed')
            self.key = f'.{task_id}'
            return
        # Check if the task has failed
        elif task_status == 'failed':
            print('failed')
            raise Exception("Error converting pdf to mp3 file")
        # If the task is still in progress, wait for 5 seconds and check again
        else:
            print('inprogress')
            sleep(5.0)
            self.await_synthesis_completion(task_id=task_id)
