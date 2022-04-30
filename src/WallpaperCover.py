#!/bin/python3
# %%
import os 
import sys
import subprocess as sp
# import PIL.Image
from PIL import Image,ImageColor


# %%
def create_overlay(image,svg,out_path,color):
    print("Processing",image, end=" ")
    if os.path.splitext(image)[-1] not in [".jpg",".png",".jpeg"]:
        return
    img = Image.open(image)
    screen_width = 1920
    screen_height= 1080
    w,h = img.size
    x = min(w//16,h//9)
    nw,nh = 16*x,9*x
    img = img.resize((screen_width,screen_height),resample=0,box=(0.5*(w-nw),0.5*(h-nh),0.5*(w+nw),0.5*(h+nh)))
    
    out = out_path
    cmd = "inkscape -w "+ str(screen_width) + " -h " + str(screen_height) +" "+ svg+" -o "+out
    # print(cmd)
    sp.Popen(cmd, shell=True).wait()
    overlay = Image.open(out)
    solid_color = Image.new('RGB', img.size, color=color)
    img.paste(solid_color,(0,0),overlay);
    img.save(out)



n = len(sys.argv)
if n != 5:
    print("Current argument length",n,"Needed 4")
    for i in range(len(sys.argv)):
        print(i,sys.argv[i])
else:
    image_path = sys.argv[1]
    svg_path   = sys.argv[2]
    out_path   = sys.argv[3]
    color      = sys.argv[4]
    if os.path.isfile(image_path):
        create_overlay(image_path,svg_path,out_path,color);
    else:
        print("File not an Image")
    


# %%



