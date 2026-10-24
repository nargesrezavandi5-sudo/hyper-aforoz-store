import os, sqlite3, time
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
from app.main import app, manager
from app import security

with TestClient(app) as c:
    con = sqlite3.connect(os.environ["DATABASE_PATH"])
    name = con.execute("select username from users").fetchone()[0]
    con.close()
    tok = security.create_token(name)

    with c.websocket_connect("/ws/admin") as ws:
        ws.send_json({"token": tok})
        ws.send_text("ping")
        print("admin pong:", ws.receive_json())
        print("admins registered:", len(manager.admins))
    time.sleep(0.2)
    print("admins after close:", len(manager.admins))

    try:
        with c.websocket_connect("/ws/admin") as ws:
            ws.send_json({"token": "bad"})
            ws.receive_json()
    except WebSocketDisconnect as e:
        print("bad token close code:", e.code, "admins:", len(manager.admins))

    try:
        with c.websocket_connect("/ws/admin") as ws:
            ws.send_bytes(b"\xff")
            ws.receive_json()
    except WebSocketDisconnect as e:
        print("malformed first msg close code:", e.code, "admins:", len(manager.admins))

    with c.websocket_connect("/ws/display") as ws:
        print("display first:", ws.receive_json()["type"])
        print("displays connected:", len(manager.displays))
        ws.send_text("ping")
        print("display pong:", ws.receive_json())
    time.sleep(0.3)
    print("displays after close:", len(manager.displays))
