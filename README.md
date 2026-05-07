### Grayjay BibleProject
This plugin adds support for the platform BibleProject, allowing you to use it in Grayjay.

### Installation
You can install the plugin by scanning this QR code:  
![QR Code](https://raw.githubusercontent.com/b-risk/Grayjay-BibleProject/refs/heads/main/qr-code.png)

Alternatively, you can add it manually by using this link:
```
grayjay://plugin/https://raw.githubusercontent.com/b-risk/Grayjay-BibleProject/refs/heads/main/BibleProjectConfig.json
```

### Features
- [x] Video Playback
- [x] Channel videos search
- [x] Channel search
- [x] Video searches
- [x] Homepage results with pagination (infinite scroll)
- [x] Support next pages
- [x] Sign plugin
- [x] Playlists support
- [x] Podcasts support


### Contributions
Contributions are welcome, feel free to submit pull requests if you think you can improve something or fix a bug.

### Signing
```bash
# Generate keypair
ssh-keygen -t rsa -b 2048 -m PEM -f ./private-key.pem

# Encode it in Base64 and set the environment variable
export SIGNING_PRIVATE_KEY="$(base64 -w 0 ./private-key.pem)"

# Run the sign script (use git bash on Windows):
sh ./sign-script.sh ./BibleProjectScript.js ./BibleProjectConfig.json
```