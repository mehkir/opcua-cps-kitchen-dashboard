const { OPCUAClient,
        resolveNodeId,
        NodeClass,
        ResultMask,
        BrowseDirection,
        NodeId}
    = require("node-opcua");

class opcua_browser {

    async browse_object_type(_server_url, _object_type) {
        let matching_node_id = NodeId.nullNodeId;
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
                matching_node_id = ref.nodeId;
                break; // Exit loop if found
            }
        }
        // Close session and disconnect
        await session.close();
        await client.disconnect();
        return matching_node_id;
    }

    async browse_objects(_server_url) {
        const client = OPCUAClient.create({});
        await client.connect(_server_url);
        const session = await client.createSession();
        // Browse the objects folder
        const browse_result = await session.browse({
            nodeId: resolveNodeId("ObjectsFolder"),
            referenceTypeId: resolveNodeId("Organizes"),
            browseDirection: BrowseDirection.Forward,
            includeSubtypes: true,
            nodeClassMask: NodeClass.Object
        });
        // Close session and disconnect
        await session.close();
        await client.disconnect();
        return browse_result;
    }

    async browse_methods(_server_url, _instance_id) {
        const client = OPCUAClient.create({});
        await client.connect(_server_url);
        const session = await client.createSession();
        // Browse the methods of the instance
        const browse_result = await session.browse({
            nodeId: _instance_id,
            referenceTypeId: resolveNodeId("HasComponent"),
            browseDirection: BrowseDirection.Forward,
            includeSubtypes: true,
            nodeClassMask: NodeClass.Method
        });
        // Close session and disconnect
        await session.close();
        await client.disconnect();
        return browse_result;
    }

    async browse_attributes(_server_url, _instance_id) {
        const client = OPCUAClient.create({});
        await client.connect(_server_url);
        const session = await client.createSession();
        // Browse the attributes of the instance
        const browse_result = await session.browse({
            nodeId: _instance_id,
            referenceTypeId: resolveNodeId("HasComponent"),
            browseDirection: BrowseDirection.Forward,
            includeSubtypes: true,
            nodeClassMask: NodeClass.Variable
        });
        // Close session and disconnect
        await session.close();
        await client.disconnect();
        return browse_result;
    }
}
module.exports = opcua_browser;