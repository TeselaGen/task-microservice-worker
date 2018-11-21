import {GET, Path} from "typescript-rest";
import { state } from "../../state";
import * as moment from "moment";
import { Tags } from "typescript-rest-swagger";

/**
 * This operation returns the status of server including the uptime
 */
@Tags("api/public")
@Path("public/status")
export class StatusController {
    /**
     * Gets the current Server Status
     */
    @GET
    public getStatus(): string {
        const uptimeStr = moment().from(state.startTime, true);
        return `Server has been operational for ${uptimeStr}`;
    }
}
