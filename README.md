# TDX18 Robotics - ARM vision running on Raspberry Pi

## Setup instructions
Install the "startup on boot" script on the Raspberry Pi by following these steps:

Copy service script:<br/>
`sudo cp install/arm-vision /etc/init.d/`

Register service:<br/>
`sudo update-rc.d arm-vision defaults`

Reboot:<br/>
`sudo reboot`


## Dependencies
This project uses a modified version of @chovy's [node-startup](https://github.com/chovy/node-startup) licensed under MIT.

