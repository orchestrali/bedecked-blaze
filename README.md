# Virtual Change Ringing

This app is a virtual bell tower! Ringers enter a name for themselves and a secret word to enter, then can assign themselves bells. Assigned bells can be rung by clicking on the sally or tail as appropriate, or hitting the indicated keys on a keyboard. The keyboard commands can be edited.

A second secret word grants "captain" powers, which at the moment are only:

- assign bells to others
- change the stage


## Make your own virtual tower!

Glitch makes it easy to copy an entire app. You can have your own virtual tower operational in two or three steps:

- Click `Remix to edit` to create your copy
- Add words in the `.env` file for the SECRET and CAPTAIN - these will be your secret words for entering the tower
- Create a glitch account if you want your tower to last more than five days

Once you've created a tower, you can get any updates I've made by clicking `Tools` -> `Import and Export` -> `Import from Github` and then entering "orchestrali/messy-quotation" in the dialog that pops up. Note that if you've made any changes besides the secret words, this will overwrite them.


## Features I might add

Some things I might get around to adding:

- handbell sounds (or even non-bell sounds)
- different view layouts - treble on left, or a circle
- option to adjust the speed of the ropes (maaaayybe)
- verbal instructions ("go next time" and the like)
- winking at another ringer (maybe just course and after bells?)
- collect striking data and see if I can do things to help with lag

Known issue:
- These animations only display correctly once on iOS 12.4.8. They seem to be fine on iOS 13. I'm not sure there's a way to fix this short of completely changing how the animations are done.



## Made by [Glitch](https://glitch.com/)

**Glitch** is the friendly community where you'll build the app of your dreams. Glitch lets you instantly create, remix, edit, and host an app, bot or site, and you can invite collaborators or helpers to simultaneously edit code with you.

Find out more [about Glitch](https://glitch.com/about).

( ᵔ ᴥ ᵔ )