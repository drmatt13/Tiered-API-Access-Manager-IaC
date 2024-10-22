import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
} from "aws-lambda";
import { parse } from "url";
import https from "https";
import {
  S3Client,
  ListObjectVersionsCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

const s3Client = new S3Client();

exports.handler = async (
  event: CloudFormationCustomResourceEvent
): Promise<CloudFormationCustomResourceResponse> => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const bucketName = event.ResourceProperties.BucketName;

  try {
    if (event.RequestType === "Delete") {
      // Empty the bucket before deleting
      await emptyS3Bucket(bucketName);
      console.log(`Bucket ${bucketName} emptied.`);
      return sendResponse(
        event,
        "SUCCESS",
        {}
      ) as any as Promise<CloudFormationCustomResourceResponse>;
    } else {
      // For non-Delete requests, simply send a SUCCESS response without doing anything
      console.log("Non-Delete request received, no action taken.");
      return sendResponse(
        event,
        "SUCCESS",
        {}
      ) as any as Promise<CloudFormationCustomResourceResponse>;
    }
  } catch (error) {
    console.error(error);
    return sendResponse(
      event,
      "FAILED",
      {}
    ) as any as Promise<CloudFormationCustomResourceResponse>;
  }
};

// Function to empty the S3 bucket
async function emptyS3Bucket(bucket: string): Promise<void> {
  let listObjectVersionsParams: any = { Bucket: bucket };
  let listedObjects;

  do {
    listedObjects = await s3Client.send(
      new ListObjectVersionsCommand(listObjectVersionsParams)
    );

    const objectsToDelete: Array<any> = [];
    if (listedObjects.Versions) {
      listedObjects.Versions.forEach((version) => {
        objectsToDelete.push({
          Key: version.Key,
          VersionId: version.VersionId,
        });
      });
    }

    if (listedObjects.DeleteMarkers) {
      listedObjects.DeleteMarkers.forEach((marker) => {
        objectsToDelete.push({ Key: marker.Key, VersionId: marker.VersionId });
      });
    }

    if (objectsToDelete.length > 0) {
      const deleteParams = {
        Bucket: bucket,
        Delete: { Objects: objectsToDelete },
      };

      await s3Client.send(new DeleteObjectsCommand(deleteParams));
    }

    // If the list was truncated, continue listing
    if (listedObjects.IsTruncated) {
      listObjectVersionsParams = {
        Bucket: bucket,
        KeyMarker: listedObjects.NextKeyMarker,
        VersionIdMarker: listedObjects.NextVersionIdMarker,
      };
    }
  } while (listedObjects.IsTruncated); // Repeat if the results were truncated
}

// Function to send a response back to CloudFormation
function sendResponse(
  event: CloudFormationCustomResourceEvent,
  responseStatus: string,
  responseData: Record<string, any>
): Promise<void> {
  const responseBody = JSON.stringify({
    Status: responseStatus,
    Reason: `See the details in CloudWatch Log Stream: ${event.LogicalResourceId}`,
    PhysicalResourceId: event.LogicalResourceId,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData,
  });

  console.log("Response body:\n", responseBody);

  const parsedUrl = parse(event.ResponseURL);
  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.path,
    method: "PUT",
    headers: {
      "content-type": "",
      "content-length": Buffer.byteLength(responseBody),
    },
  };

  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      console.log(`Status code: ${response.statusCode}`);
      console.log(`Status message: ${response.statusMessage}`);
      resolve();
    });

    request.on("error", (error) => {
      console.error("send(..) failed executing https.request(..):", error);
      reject(error);
    });

    request.write(responseBody);
    request.end();
  });
}
