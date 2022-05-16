#!/bin/python3
import os 
import sys
libcheck = 1
try:
    from PIL import Image, ImageGrab
except:
    libcheck *= 2
try:
    from cairosvg import svg2png
except:
    libcheck *= 3
if libcheck != 1:
    print("Please install required python packages")
    print("Run the following in terminal:")
    if libcheck %2 == 0: print("\tpip install pillow")
    if libcheck %3 == 0: print("\tpip install cairosvg")
    quit()

# Holy Grail color #0000ff, this color would always get replaced

def create_overlay(image,overlay,out_path):
    if os.path.splitext(image)[-1] not in [".jpg",".png",".jpeg"]:
        return "Image File not in jpg,png or jpeg"
    if os.path.splitext(overlay)[-1] not in [".svg"]:
        return "Overlay File not in svg"

    # resize image to match screen resolution
    img = Image.open(image)
    screen_width, screen_height= ImageGrab.grab().size
    w,h = img.size
    x = min(w//16,h//9)
    nw,nh = 16*x,9*x
    img = img.resize((screen_width,screen_height),resample=0,box=(0.5*(w-nw),0.5*(h-nh),0.5*(w+nw),0.5*(h+nh)))
    # load overlay
    svg2png(url=overlay, write_to=overlay+".png")
    overlay = Image.open(overlay+".png")
    overlay = overlay.resize((screen_width,screen_height),resample=0)
    img.paste(overlay,(0,0), overlay) # adding solid color image on top with overlay as mask
    img.save(out_path)



n = len(sys.argv)
if n != 4:
    print("Current argument length",n,"Needed 3")
    for i in range(len(sys.argv)):
        print(i,sys.argv[i])
else:
    try:
        image_path   = sys.argv[1]
        overlay_path = sys.argv[2]
        out_path     = sys.argv[3]
        print(create_overlay(image_path,overlay_path,out_path))
    except:
        print("some error occured")




