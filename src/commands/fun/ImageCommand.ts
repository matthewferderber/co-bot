import { MessageAttachment } from 'discord.js';
import { Argument, ArgumentType, Command, Message } from 'djs-cc';
import { getManager } from 'typeorm';
import { v4 } from 'uuid';
import { Image } from '../../entity/Image';
import { User } from '../../entity/User';
import * as FileManager from '../../FileManager.js';

export class ImageCommand extends Command {
    constructor() {
        super({
            aliases: ['i'],
            args: [
                new Argument({
                    name: 'operationOrImageName',
                    required: false,
                    type: ArgumentType.String,
                }),
                new Argument({
                    name: 'imageName',
                    required: false,
                    type: ArgumentType.String,
                }),
                new Argument({
                    name: 'imageUrl',
                    required: false,
                    type: ArgumentType.String,
                })],
            description: 'Displays an image',
            name: 'image',
            usage: 'image imageName',
        });
    }
    public async run(msg: Message, args: Map<string, any>) {
        const operationOrImage = args.get('operationOrImageName');
        const imageName = args.get('imageName');
        const imageUrl = args.get('imageUrl');

        if (operationOrImage || imageUrl || msg.attachments) {
            switch (operationOrImage) {
                case "add":
                    await this.add(msg, imageName, imageUrl);
                    break;
                case "delete":
                case "remove":
                case "del":
                    await this.remove(msg, imageName);
                    break;
                default:
                    await this.display(msg, operationOrImage);
                    break;
            }
        } else {
            msg.reply('Provide a url or attach an image');
        }
    }
    private async add(msg: Message, imageName: string, imageUrl: string) {
        const manager = getManager();
        let url: string;
        let id;
        if (imageUrl) {
            url = imageUrl;
            id = v4();
        } else if (msg.attachments) {
            url = msg.attachments.first().url;
            id = msg.attachments.first().id;
        }
        const fileType = url.substring(url.lastIndexOf('.'));
        let img = new Image({
            dateUploaded: new Date(),
            fileType,
            filename: id + fileType,
            id,
            key: imageName,
            user: new User({ id: msg.author.id}),
        });
        img = await manager.save(img);
        await FileManager.download(url, img.filename);
        msg.reply("Image added");
    }

    private async remove(msg: Message, imageName: string) {
        const manager = getManager();
        const image = await manager.createQueryBuilder(Image, 'u')
            .where("key ILIKE :key", { key: imageName.toLowerCase()})
            .getOne();
        manager.remove(image);
        if (image) {
            await FileManager.remove(image.filename);
            console.log(`Image ${image.key} removed by: ${msg.author.username}`);
            msg.reply(`${image.key} has been removed`);
        } else {
            msg.reply(`${imageName} not found`);
        }
    }

    private async display(msg: Message, imageName: string) {
        const manager = getManager();
        const image = await manager.createQueryBuilder(Image, 'u')
            .where("key ILIKE :key", { key: imageName.toLowerCase()})
            .getOne();
        if (image) {
            msg.delete();
            msg.channel.send(`Image requested by: ${msg.author}`,
                new MessageAttachment(FileManager.getPath(image.filename)));
        } else {
            msg.reply('Image not found');
        }
    }
}
