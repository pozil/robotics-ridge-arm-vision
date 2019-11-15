export const TARGETS = {
  home: { // Move to home position
    'arm-1': [
      {channel: 0, target: 410},
      {channel: 1, target: 450},
      {channel: 2, target: 300},
      {channel: 3, target: 495},
      {channel: 4, target: 450},
      {channel: 5, target: 330},
    ]
  },
  positionToCapturePicture: { // Move above object, lower arm, rotate wrist and open claw
    'arm-1': [
      {channel: 0, target: 365},
      {channel: 1, target: 435},
      {channel: 2, target: 300},
      {channel: 3, target: 495},
      {channel: 4, target: 345},
      {channel: 5, target: 330},
    ]
  },
  closeClaw: {
    'arm-1': [
      {channel: 5, target: 250},
    ]
  },
  movePayloadPlastic: {
    'arm-1': [
      {channel: 0, target: 378},
      {channel: 1, target: 348},
      {channel: 2, target: 348},
      {channel: 3, target: 495},
      {channel: 4, target: 360},
      {channel: 5, target: 330},
    ]
  },
  movePayloadPaper: {
    'arm-1': [
      {channel: 0, target: 356},
      {channel: 1, target: 364},
      {channel: 2, target: 320},
      {channel: 3, target: 495},
      {channel: 4, target: 386},
      {channel: 5, target: 330},
    ]
  },
  movePayloadMetal: {
    'arm-1': [
      {channel: 0, target: 366},
      {channel: 1, target: 360},
      {channel: 2, target: 328},
      {channel: 3, target: 495},
      {channel: 4, target: 367},
      {channel: 5, target: 330},
    ]
  },
  movePayloadUp: {
    'arm-1': [
      {channel: 1, target: 401},
    ]
  },
  movePayloadToTrain: {
    'arm-1': [
      {channel: 0, target: 328},
      {channel: 1, target: 365},
      {channel: 2, target: 343},
      {channel: 3, target: 495},
      {channel: 4, target: 337},
    ]
  },
  lowerOnTrain: {
    'arm-1':[
      {channel: 1, target: 353},
    ]
  },
  dropOnTrain: {
    'arm-1':[
      {channel: 5, target: 330},
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
