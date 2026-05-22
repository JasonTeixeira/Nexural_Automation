# Kill-Switch Acknowledgement Proof

Required evidence:

- `kill_switch(reason)` returns an accepted acknowledgement.
- The bridge writes a control record with `control=kill_switch`.
- The record is explicitly paper-only until an external live-routing config is reviewed.
