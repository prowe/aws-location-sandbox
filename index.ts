import { LocationClient, SearchPlaceIndexForTextCommand,  } from "@aws-sdk/client-location";

const client = new LocationClient({});

const searchResponse = await client.send(new SearchPlaceIndexForTextCommand({
    IndexName: 'prowe-place-index',
    Text: '4501 NW Urbandale Ave. Urbandale, IA'
}));
