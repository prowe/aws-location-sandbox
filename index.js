System.register(["@aws-sdk/client-location"], function (exports_1, context_1) {
    "use strict";
    var client_location_1, client, searchResponse;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (client_location_1_1) {
                client_location_1 = client_location_1_1;
            }
        ],
        execute: async function () {
            client = new client_location_1.LocationClient({});
            searchResponse = await client.send(new client_location_1.SearchPlaceIndexForTextCommand({
                IndexName: 'prowe-place-index',
                Text: '4501 NW Urbandale Ave. Urbandale, IA'
            }));
        }
    };
});
