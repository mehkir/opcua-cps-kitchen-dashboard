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

    async browse_objects(_server_url, _start_node_id = resolveNodeId("ObjectsFolder"), _reference_type_id = resolveNodeId("Organizes")) {
        const client = OPCUAClient.create({});
        await client.connect(_server_url);
        const session = await client.createSession();
        // Browse the objects folder
        const browse_result = await session.browse({
            nodeId: _start_node_id,
            referenceTypeId: _reference_type_id,
            browseDirection: BrowseDirection.Forward,
            includeSubtypes: true,
            nodeClassMask: NodeClass.Object,
            resultMask: 63 // All
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
            nodeClassMask: NodeClass.Method,
            resultMask: 63 // All
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
            nodeClassMask: NodeClass.Variable,
            resultMask: 63 // All
        });
        // Close session and disconnect
        await session.close();
        await client.disconnect();
        return browse_result;
    }
    
    async browse_instance(_server_url, _object_type) {
        const object_type_id = await this.browse_object_type(_server_url, _object_type);
        if (object_type_id === NodeId.nullNodeId) {
            return NodeId.nullNodeId;
        }
        const browse_result = await this.browse_objects(_server_url);
        for (const ref of browse_result.references) {
            if (ref.typeDefinition.toString() === object_type_id.toString()) {
                return ref.nodeId;
            }
        }
        return NodeId.nullNodeId;
    }

    async has_object_type(_server_url, _object_type) {
        const node_id = await this.browse_object_type(_server_url, _object_type);
        return node_id !== NodeId.nullNodeId;
    }

    async has_instance(_server_url, _object_type) {
        const object_type_id = await this.browse_object_type(_server_url, _object_type);
        if (object_type_id === NodeId.nullNodeId) {
            return false;
        }
        const browse_result = await this.browse_objects(_server_url);
        for (const ref of browse_result.references) {
            if (ref.typeDefinition.toString() === object_type_id.toString()) {
                return true;
            }
        }
        return false;
    }
}
module.exports = opcua_browser;