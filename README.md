# Frontend

## Deployment

Log in to aws:

```sh
aws ecr get-login-password --region eu-north-1 | podman login --username AWS --password-stdin 930650061532.dkr.ecr.eu-north-1.amazonaws.com
```

Build image and deploy to aws:

```sh
podman build -t janus-trainer-app-arm64 .
podman tag janus-trainer-app-arm64:latest 930650061532.dkr.ecr.eu-north-1.amazonaws.com/janus-trainer-app-arm64:latest
podman push 930650061532.dkr.ecr.eu-north-1.amazonaws.com/janus-trainer-app-arm64:latest
```

Deployment is done via UI.

# TODOs
Read up on MUI's nextjs integration: https://mui.com/material-ui/guides/nextjs/
