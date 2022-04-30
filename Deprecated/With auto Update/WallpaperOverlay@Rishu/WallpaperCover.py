#!/bin/python3
# %%
import os 
import sys
import subprocess as sp
import PIL.Image


# %%
def create_overlay(image,svg,out_path):
    print("Processing",image, end=" ")
    filename, file_extension = os.path.splitext(image)
    # print(file_extension)
    if file_extension not in [".jpg",".png",".jpeg"]:
        return
    img = PIL.Image.open(image)
    out = out_path
    print("to ", out)
    screen_width = 1920
    screen_height= 1080
    img = img.resize((screen_width,screen_height),resample=0)
    # svg = PIL.Image.open(svg_path)
    # svg.resize((screen_width,screen_height))
    cmd = "inkscape -w "+ str(screen_width) + " -h " + str(screen_height) +" "+ svg+" -o "+out
    print(cmd)
    sp.Popen(cmd, shell=True).wait()
    overlay = PIL.Image.open(out)
    img.paste(overlay,(0,0),overlay);
    img.save(out)



n = len(sys.argv)
if n != 4:
    print("Pass Correct Arguments")
else:
    image_path = sys.argv[1]
    svg_path   = sys.argv[2] 
    out_path   = sys.argv[3]
    if os.path.isfile(image_path):
        create_overlay(image_path,svg_path,out_path);
    else:
        imglist = os.listdir(image_path);
        if(image_path[-1] != '/'):
                image_path = image_path + "/"
        for img in imglist:
            try:
                create_overlay(image_path+img,svg_path,out_path)
            except:
                print("Exception Occured")
    


# %%



