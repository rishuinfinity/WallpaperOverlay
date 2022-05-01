#!/bin/python3
import os 
import sys
import subprocess as sp
from PIL import Image, ImageGrab

# Holy Grail color #ffff01ff

def create_overlay(image,overlay,out_path,color):
    if os.path.splitext(image)[-1] not in [".jpg",".png",".jpeg"]:
        return "Image File not in jpg,png or jpeg"
    if os.path.splitext(overlay)[-1] not in [".png"]:
        return "Overlay File not in png"
    # resize image to match screen resolution
    img = Image.open(image)
    screen_width, screen_height= ImageGrab.grab().size
    w,h = img.size
    x = min(w//16,h//9)
    nw,nh = 16*x,9*x
    img = img.resize((screen_width,screen_height),resample=0,box=(0.5*(w-nw),0.5*(h-nh),0.5*(w+nw),0.5*(h+nh)))
    
    overlay = Image.open(overlay)
    overlay = overlay.resize((screen_width,screen_height),resample=0)
    solid_color = Image.new('RGB', img.size, color=color)
    img.paste(solid_color,(0,0),overlay) # adding solid color image on top with overlay as mask
    img.save(out_path)
    return "true"



n = len(sys.argv)
if n != 5:
    print("Current argument length",n,"Needed 4")
    for i in range(len(sys.argv)):
        print(i,sys.argv[i])
else:
    image_path   = sys.argv[1]
    overlay_path = sys.argv[2]
    out_path     = sys.argv[3]
    color        = sys.argv[4]
    if os.path.isfile(image_path):
        print(create_overlay(image_path,overlay_path,out_path,color))
    else:
        print("File not an Image")




