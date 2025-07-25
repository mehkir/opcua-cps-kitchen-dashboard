const { OPCUAClient,
        AttributeIds,
        resolveNodeId,
        NodeClass,
        ResultMask,
        BrowseDirection,
        ApplicationType }
    = require("node-opcua");

class opcua_browser {

    async has_object_type(_server_url, _object_type) {
        let has_object_type = false;
        const client = OPCUAClient.create({});
        await client.connect(_server_url);
        const session = await client.createSession();
        // Browse the object types folder
        const browse_result = await session.browse({
            nodeId: resolveNodeId("BaseObjectType"),
            referenceTypeId: resolveNodeId("HasSubtype"),
            browseDirection: BrowseDirection.Forward,
            includeSubtypes: true,
            nodeClassMask: NodeClass.ObjectType,
            resultMask: ResultMask.BrowseName
        });
        // Check if the target object type exists
        for (const ref of browse_result.references) {
            if (ref.browseName.name === _object_type) {
                has_object_type = true;
                break; // Exit loop if found
            }
        }
        // Close session and disconnect
        await session.close();
        await client.disconnect();
        return has_object_type;
    }
}
module.exports = opcua_browser;