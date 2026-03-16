import _ from 'lodash';

import Request from '@/lib/request/Request.ts';
import Response from '@/lib/response/Response.ts';
import chat from '@/api/controllers/chat.ts';
import process from "process";
import logger from "@/lib/logger.ts";


const DEEP_SEEK_CHAT_AUTHORIZATION = process.env.DEEP_SEEK_CHAT_AUTHORIZATION;

function formatFunction(fun) {
    const params = _.entries(fun.parameters.properties).map(([key, value]) => `${value.type} ${key}:${value.description}`).join(", ")
    return `fun ${fun.name}(${params})`;
}

export default {

    prefix: '/v1/chat',

    post: {

        '/completions': async (request: Request) => {
            request
                .validate('body.conversation_id', v => _.isUndefined(v) || _.isString(v))
                .validate('body.messages', _.isArray)
                .validate('headers.authorization', _.isString)
                .validate('body.tools', v => _.isArray(v) || _.isUndefined(v));

            // 如果环境变量没有token则读取请求中的
            if (DEEP_SEEK_CHAT_AUTHORIZATION) {
                request.headers.authorization = "Bearer " + DEEP_SEEK_CHAT_AUTHORIZATION;
            }
            // token切分
            const tokens = chat.tokenSplit(request.headers.authorization);
            // 随机挑选一个token
            const token = _.sample(tokens);
            let { model, conversation_id: convId, messages, stream } = request.body;

            if ('tools' in request.body) {
                const tools = request.body.tools;
                const ts = `你可以通过指定格式发起函数调用,调用应该用json放在对话末尾的functioncall的md代码块中,例如:
\`\`\`functioncall
{"name":"send_email","arguments":[{"to":"user@example.com"},{"subject":"会议邀请"}]}
\`\`\`
一次回复中你只能进行一次函数调用,必须严格按照函数调用格式,参数名称和参数必须用"包裹,并且内部内容需要反转译`;
                let toolList = [];
                tools.forEach(element => {
                    try {
                        if (element.type !== "function") {
                            logger.warn(`未处理的工具: ${element}`)
                            return;
                        }
                        toolList.push(formatFunction(element.function));
                    } catch (e) {
                        logger.warn(`工具提示词格式化失败: ${element}`)
                    }
                });
                messages[0].content += "\n" + `你可以调用的函数列表如下\n${toolList.join("\n")}` + "\n" + ts;
            }

            model = model.toLowerCase();
            if (stream) {
                const stream = await chat.createCompletionStream(model, messages, token, convId);
                return new Response(stream, {
                    type: "text/event-stream"
                });
            }
            else
                return await chat.createCompletion(model, messages, token, convId);
        }

    }

}