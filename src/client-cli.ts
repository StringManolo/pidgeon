import {
  createUser,
  sendMessage,
  findUser,
  getUserList,
  decryptInbox,
  deleteInbox,
} from './client';

// Obtener argumentos de línea de comandos
const [, , command, ...args] = process.argv;

// Ejecutar el comando correspondiente
switch (command) {
  case 'createUser':
    if (args.length !== 1) {
      console.error('Uso incorrecto. El comando createUser debe recibir un argumento: <alias>');
    } else {
      const [alias] = args;
      createUser(alias);
    }
    break;

  case 'sendMessage':
    if (args.length !== 3) {
      console.error(
        'Uso incorrecto. El comando sendMessage debe recibir tres argumentos: <userId> <sender> <content>'
      );
    } else {
      const [userId, sender, content] = args;
      sendMessage(userId, sender, content);
    }
    break;

  case 'findUser':
    if (args.length !== 1) {
      console.error('Uso incorrecto. El comando findUser debe recibir un argumento: <userId>');
    } else {
      const [userId] = args;
      findUser(userId);
    }
    break;

  case 'getUserList':
    if (args.length !== 0) {
      console.error('Uso incorrecto. El comando getUserList no acepta argumentos');
    } else {
      getUserList();
    }
    break;

  case 'decryptInbox':
    if (args.length !== 1) {
      console.error('Uso incorrecto. El comando decryptInbox debe recibir un argumento: <userId>');
    } else {
      const [userId] = args;
      decryptInbox(userId);
    }
    break;

  case 'deleteInbox':
    if (args.length !== 1) {
      console.error('Uso incorrecto. El comando deleteInbox debe recibir un argumento: <userId>');
    } else {
      const [userId] = args;
      deleteInbox(userId);
    }
    break;

  default:
    console.log(
      'Comandos disponibles:\n' +
        '  createUser <alias>\n' +
        '  sendMessage <userId> <sender> <content>\n' +
        '  findUser <userId>\n' +
        '  getUserList\n' +
        '  decryptInbox <userId>\n' +
        '  deleteInbox <userId>'
    );
    break;
}

