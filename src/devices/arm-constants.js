export const TARGETS = {
  home: { // Move to home position
    'arm-1': [
      {channel: 0, target: 440},
      {channel: 1, target: 419},
      {channel: 2, target: 302},
      {channel: 3, target: 220},
      {channel: 4, target: 260},
      {channel: 5, target: 305},
    ]
  },
  positionToCapturePicture: { // Move above object, lower arm, rotate wrist and open claw
    'arm-1': [
      {channel: 0, target: 385},
      {channel: 1, target: 450},
      {channel: 2, target: 288},
      {channel: 3, target: 335},
      {channel: 4, target: 360},
      {channel: 5, target: 305},
    ]
  },
  closeClaw: {
    'arm-1': [
      {channel: 5, target: 250},
    ]
  },
  movePayloadPlastic: {
    'arm-1': [
      {channel: 0, target: 374},
      {channel: 1, target: 374},
      {channel: 2, target: 307},
      {channel: 3, target: 335},
      {channel: 4, target: 360},
      {channel: 5, target: 305},
    ]
  },
  movePayloadPaper: {
    'arm-1': [
      {channel: 0, target: 390},
      {channel: 1, target: 367},
      {channel: 2, target: 316},
      {channel: 3, target: 328},
      {channel: 4, target: 360},
      {channel: 5, target: 305},
    ]
  },
  movePayloadMetal: {
    'arm-1': [
      {channel: 0, target: 400},
      {channel: 1, target: 356},
      {channel: 2, target: 337},
      {channel: 3, target: 335},
      {channel: 4, target: 360},
      {channel: 5, target: 305},
    ]
  },
  movePayloadUp: {
    'arm-1': [
      {channel: 1, target: 400},
    ]
  },
  movePayloadToTrain: {
    'arm-1': [
      {channel: 0, target: 345},
      {channel: 1, target: 400},
      {channel: 2, target: 326},
      {channel: 3, target: 347},
      {channel: 4, target: 447}
    ]
  },
  lowerOnTrain: {
    'arm-1':[
      {channel: 1, target: 364},
    ]
  },
  dropOnTrain: {
    'arm-1':[
      {channel: 5, target: 305},
    ]
  }
}

export const SLEEPS = {
  closeClaw: {
    'arm-1': 1000,
  },
  movePayload: {
    'arm-1': 6000,
  },
  moveToTrain: {
    'arm-1': 6000,
  },
  dropOnTrain: {
    'arm-1': 4400,
  },
}
