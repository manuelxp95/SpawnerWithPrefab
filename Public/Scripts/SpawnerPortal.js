// -----JS CODE-----

// @input Component.DeviceTracking deviceTracking
// @input SceneObject scene {"label":"Scene of Portal"}
// @input int raidAmount {"label":"Raid Amount"}

function canSpawn(){
    print(scene.arrayPortals)
    //    var amountPortals=scene.arrayPortals.length
  //  if (amountPortal > 0){
   //     print("BOCA CAMPEON")
   // }
}

script.createEvent("TapEvent").bind(canSpawn);