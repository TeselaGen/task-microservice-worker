import {GET, Path, PathParam} from "typescript-rest";
import { Tags } from "typescript-rest-swagger";
/**
 * This is a demo operation to show how to use typescript-rest library.
 */
@Tags("api/public")
@Path("public/hello")
export class HelloController {
    /**
     * Send a greeting message.
     * @param name The name that will receive our greeting message
     */
    @Path(":name")
    @GET
    public sayHello(@PathParam("name") name: string): string {
        return "Hello " + name;
    }
}
