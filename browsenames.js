/* ROBOT */
const Robot = {
    // object type nodes
    TYPE : "RobotType",
    REMOTE_TYPE : "RemoteRobotType",
    // method nodes
    RECEIVE_TASK : "ReceiveTask",
    HANDOVER_FINISHED_ORDER : "HandoverFinishedOrder",
    // attribute nodes
    POSITION : "Position",
    RECIPE_ID : "RecipeId",
    DISH_NAME : "DishName",
    ACTION_NAME : "ActionName",
    INGREDIENTS : "Ingredients",
    OVERALL_TIME : "OverallTime",
    CURRENT_TOOL : "CurrentTool",
    LAST_EQUIPPED_TOOL : "LastEquippedTool",
    CAPABILITIES : "Capabilities"
};

/* CONVEYOR */
const Conveyor = {
    // object type nodes
    TYPE : "ConveyorType",
    REMOTE_TYPE : "RemoteConveyorType",
    PLATE_TYPE : "PlateType",
    // plate information nodes
    PLATE_ID : "Id",
    PLATE_POSITION : "Position",
    PLATE_RECIPE_ID : "RecipeId",
    PLATE_OCCUPIED : "Occupied",
    // method nodes
    FINISHED_ORDER_NOTIFICATION : "FinishedOrderNotification",
    // attribute nodes
    TOTAL_PLATES : "TotalPlates",
    OCCUPIED_PLATES : "OccupiedPlates"
};

/* CONTROLLER */
const Controller = {
    // object type node
    TYPE : "ControllerType",
    REMOTE_TYPE : "RemoteControllerType",
    // method nodes
    REGISTER_ROBOT : "RegisterRobot",
    CHOOSE_NEXT_ROBOT : "ChooseNextRobot",
    // attribute nodes
    REGISTERED_ROBOTS : "RegisteredRobots"
};

/* KITCHEN */
const Kitchen = {
    // object type node
    TYPE : "KitchenType",
    // method nodes
    PLACE_RANDOM_ORDER : "PlaceRandomOrder",
    // attribute nodes
    CONNECTIVITY : "Connectivity",
    RECEIVED_ORDERS : "ReceivedOrders",
    ASSIGNED_ORDERS : "AssignedOrders",
    DROPPED_ORDERS : "DroppedOrders",
    COMPLETED_ORDERS : "CompletedOrders"
};

module.exports = { Robot, Conveyor, Controller, Kitchen };