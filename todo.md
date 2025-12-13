# TODO LIST:

<!-- ## 1. Bookmark functionality -->
<!-- ## 2. query search in address bar, as in when the user searches for querys, it thinks it is a url -->
## 3. add to home screen, not working.
## 4. new incog with search engines
## 5. desktop mode
## 6. recent tabs. its not showing any recent tabs.
## 7. help and feedback page, just make a basic one.
## 8. tab preview width is a little off. it looks like the view you would see in a 
## 9. bug: lots of tabs, not able to scroll down to open the bottom tab. (suggestion: add scrolling and the screen be 100% the height of the webview area ig. )
## 10. pyraxis://newtab ://incognito ://settings , basically custom urls etc..
## 11. Local Storage History. 
## 12. Make a custom error page - 404 Page Not Found
## 13. Custom no interrrrnet page - because teh offline page we already have is hosted. which yk, no internet. so yeah
## 14. what all were teh other bugs
## 15. settings page doesnt exist
## 16. the desktop mode doesnt work
## 17. download not shown once downloaded
## 18. contact us and help & feedback
## 19. search engine not scrollable whne the gui opens
## 20. the search bar is kinda small - ez fix, just increase the font-size
## 21. the popup notifications seems old - for that i think we might have to make custom ones. 
## 22. by me a coffee page lol 
## 23. stripe payments and support us
## 24. E-Commerce Site to sell the 'PYKEY'
## 25. YT Shorts loading thing just stays there. - i dont understand. 
## 26. AUTO_UPDATES
## 27. auto url search id google by defualt



this is what the comments extension does
<!--! hi -->
<!--!! hi -->
<!--* hi -->  
<!--** hi -->
<!--- hi -->
<!--# hi -->
<!--$ hi -->
<!--? hi -->
<!--todo hi -->w
<!-- hi --> 

Note: Comment Of the Completed Ones. 


i just had an idea. for me to connect to parsec the app has to be open. 
what if we use shitty apps taht only require your lap to be on, like google chrome desktop or something. then using that i turn on parsec tehn to connect. how is that idea. you get it?

should i? use android studio? sure le 

## App icon / splash updates

- Added a generation script `scripts/generate-icons.js` that uses `sharp` to create centered, scaled PNG icons and adaptive-foreground images from the source logo.
- To generate icons locally:

```powershell
# install sharp (native build required)
npm install --save-dev sharp
npm run generate-icons
```

- The script expects your source logo at `assets/images/Pyraxis (1).png`. It will output:
	- `assets/images/app-icon-<size>.png` (square icons)
	- `assets/images/app-icon-foreground-<size>.png` (adaptive foregrounds)
	- `assets/images/favicon-256.png`
	- `assets/images/splash-logo-1024.png`

- After generating, build/upload your app. Notes:
	- iOS will always apply rounded corners; full non-rectangular icons aren't supported by iOS app store icons.
	- Android adaptive icons use a background and a foreground layer; the foreground can be a transparent PNG so the launcher mask will shape it. Some launchers still force a shape.
	- If you want different background color for Android adaptive icons, edit `expo.android.adaptiveIcon.backgroundColor` in `app.json`.