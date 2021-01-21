##Step 1 (Install IPFS Desktop):
1. Follow instructions at https://docs.ipfs.io/install/ipfs-desktop/
2. Forward port 4001 to this machine
3. If planning to run this all the time you may want to set IPFS to run on boot.  In linux I did that by running ```crontab -e``` and adding ```@reboot /usr/local/bin/ipfs daemon```

##Step 2 (Install NodeJS):
1. Follow instructions at https://nodejs.org/en/download/

##Step 3 (Install this app):
1) Copy files to a folder
2) In console run ```npm install```

##Step 4 (Create API Key):
1. Create an account at https://aws.amazon.com/
2. Services->IAM
3. In left column: Policies
4. Blue Create policy button
5. JSON

```JSON
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "s3:GetObjectAcl",
                "s3:GetObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::*/*",
                "arn:aws:s3:::chain-data-address"
            ]
        }
    ]
}
```

6. Blue Review policy button
7. name: digiassetX_data
8. Blue Create policy
9. In left Column: Groups
10. Blue Create Group Button
11. Group Name: digiassetX_data
12. Type digi into search then select digiassetX_data
13. Blue Next Step Button
14. Blue Create Group Button
15. On left panel select Users
16. Blue add user button
17. user name: digiassetX_data
18. Select: Programmatic access
19. Blue Next: Permissions button
20. select: digiassetX_data
21. Blue Next: Tags button
22. Blue Next: Review button
23. Blue Create user button
24. Copy Access key ID and Secret access key into config/config.js
25. click Close(make sure you have copied keys there will not be a second chance.

##Step 5 (Edit config):
1. Open config/config.js
2. Under includeMedia set the max file size you are willing to accept and what file types.  If you will accept all files just comment out the names and mimeTypes lines by putting // before them
3. The rest of the lines you will likely not want to change.  Save the file.

##Step 4 (Run the program):
##### To run once
1. in a command line type ```node index.js```

##### To run continuously in the background in linux
1. Install PM2 by following instructions at https://www.vultr.com/docs/how-to-setup-pm2-on-ubuntu-16-04
2. Add the app by running ```pm2 start index.js --name meta```
3. To save so it starts on next boot ```pm2 save```
3. You can check console logs by typing ```pm2 log meta```

#Step 5 (View Loaded Meta Data):
1. Open a web browser 
2. In the address bar not the search bar enter ```http://127.0.0.1:8090/```
3. You can now view any meta data that has been stored to your server, mark it as acceptable and delete content that is offensive.